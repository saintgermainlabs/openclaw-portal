/**
 * Lightweight OpenClaw Gateway client for the portal BFF.
 * Token stays server-side — never expose OPENCLAW_GATEWAY_TOKEN to the browser.
 *
 * When no token / gateway is unreachable, mockMode keeps the UI usable for local UI work.
 */

import { compilePromptLocally, extractTargetAndBrief } from './prompt-engineer.js'
import {
  buildDeviceAuthPayload,
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64Url,
  signDevicePayload,
} from './device-identity.js'
import { ensureTailnetNoProxy } from './tailnet.js'

type Pending = {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

type MockSession = {
  id: string
  title: string
  updated_at: string
  agent_id?: string
}

type MockMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export class PortalGateway {
  readonly publicUrl: string
  mockMode: boolean

  private url: string
  private token: string
  private ws: WebSocket | null = null
  private connected = false
  private authenticated = false
  private connecting: Promise<void> | null = null
  private pending = new Map<string, Pending>()
  private seq = 0

  private mockSessionsStore: MockSession[] = []
  private mockHistoryStore = new Map<string, MockMessage[]>()
  private deviceIdentity: ReturnType<typeof loadOrCreateDeviceIdentity> | null = null

  constructor() {
    this.url = process.env.OPENCLAW_GATEWAY_URL || 'wss://openclaw.tiger-bushmaster.ts.net'
    this.token = process.env.OPENCLAW_GATEWAY_TOKEN || ''
    this.publicUrl = this.url.replace(/^wss?:\/\//, '').split('/')[0] ?? this.url
    this.mockMode = !this.token
    if (this.mockMode) {
      console.warn('[openclaw-portal] No OPENCLAW_GATEWAY_TOKEN — running in mock mode')
    } else {
      try {
        this.deviceIdentity = loadOrCreateDeviceIdentity()
        console.log('[openclaw-portal] Device identity:', this.deviceIdentity.deviceId.slice(0, 12) + '…')
      } catch (err) {
        console.warn('[openclaw-portal] Device identity unavailable:', err)
      }
    }
  }

  async ensureConnected(): Promise<void> {
    if (this.mockMode) return
    if (this.connected && this.authenticated && this.ws?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting

    this.connecting = new Promise<void>((resolve, reject) => {
      const wsUrl = new URL(this.url)
      if (this.token) wsUrl.searchParams.set('token', this.token)

      // Direct Tailnet path — never tunnel wss://*.ts.net through HTTP_PROXY
      ensureTailnetNoProxy()
      const savedProxy: Record<string, string | undefined> = {}
      for (const k of [
        'HTTP_PROXY',
        'HTTPS_PROXY',
        'ALL_PROXY',
        'http_proxy',
        'https_proxy',
        'all_proxy',
      ]) {
        savedProxy[k] = process.env[k]
        delete process.env[k]
      }

      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl.toString())
      } finally {
        for (const [k, v] of Object.entries(savedProxy)) {
          if (v === undefined) delete process.env[k]
          else process.env[k] = v
        }
      }
      this.ws = ws

      const timeout = setTimeout(() => {
        ws.close()
        this.connecting = null
        reject(new Error('Gateway connection timeout'))
      }, 10_000)

      ws.onopen = () => {
        console.log('[openclaw-portal] WebSocket open — awaiting challenge (Tailnet)')
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        this.connecting = null
        reject(new Error('Gateway WebSocket error'))
      }

      ws.onclose = () => {
        this.connected = false
        this.authenticated = false
        this.connecting = null
      }

      ws.onmessage = (event) => {
        let data: Record<string, unknown>
        try {
          data = JSON.parse(String(event.data))
        } catch {
          return
        }

        if (data.type === 'event' && data.event === 'connect.challenge') {
          const payload = data.payload as { nonce?: string } | undefined
          const requestId = crypto.randomUUID()
          const nonce = payload?.nonce
          const signedAtMs = Date.now()
          const role = 'operator'
          const scopes = ['operator.admin', 'operator.write', 'operator.read']
          const clientId = 'cli'
          const clientMode = 'backend'

          let device: Record<string, unknown> | undefined
          if (this.deviceIdentity) {
            const authPayload = buildDeviceAuthPayload({
              deviceId: this.deviceIdentity.deviceId,
              clientId,
              clientMode,
              role,
              scopes,
              signedAtMs,
              token: this.token || null,
              nonce,
            })
            device = {
              id: this.deviceIdentity.deviceId,
              publicKey: publicKeyRawBase64Url(this.deviceIdentity.publicKeyPem),
              signature: signDevicePayload(this.deviceIdentity.privateKeyPem, authPayload),
              signedAt: signedAtMs,
              nonce,
            }
          }

          this.pending.set(requestId, {
            resolve: (value) => {
              clearTimeout(timeout)
              this.connected = true
              this.authenticated = true
              this.connecting = null
              console.log('[openclaw-portal] Authenticated to gateway', value ? '(payload ok)' : '')
              resolve()
            },
            reject: (err) => {
              clearTimeout(timeout)
              this.connecting = null
              reject(err)
            },
          })

          ws.send(
            JSON.stringify({
              type: 'req',
              id: requestId,
              method: 'connect',
              params: {
                minProtocol: 4,
                maxProtocol: 4,
                client: {
                  id: clientId,
                  version: '1.0.1',
                  platform: process.platform || 'linux',
                  mode: clientMode,
                },
                auth: { token: this.token },
                role,
                scopes,
                device,
              },
            }),
          )
          return
        }

        if (data.type === 'res' && data.id != null) {
          const pending = this.pending.get(String(data.id))
          if (!pending) return
          this.pending.delete(String(data.id))
          if (data.ok === false) {
            const errPayload = data.error as { message?: string } | undefined
            pending.reject(new Error(errPayload?.message || 'RPC failed'))
          } else {
            pending.resolve(data.payload)
          }
        }
      }
    })

    return this.connecting
  }

  async call<T = unknown>(method: string, params: Record<string, unknown>): Promise<T> {
    if (this.mockMode) throw new Error('mock mode')
    await this.ensureConnected()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway not connected')
    }

    const id = `portal-${++this.seq}-${Date.now()}`
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, 30_000)

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value as T)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })

      this.ws!.send(JSON.stringify({ type: 'req', id, method, params }))
    })
  }

  mockSessions(): MockSession[] {
    if (this.mockSessionsStore.length === 0) {
      this.createMockSession('Portal workspace')
    }
    return this.mockSessionsStore
  }

  createMockSession(title?: string, agentId?: string): MockSession {
    const session: MockSession = {
      id: `mock-${crypto.randomUUID().slice(0, 8)}`,
      title: title || 'New session',
      updated_at: new Date().toISOString(),
      agent_id: agentId,
    }
    this.mockSessionsStore.unshift(session)
    this.mockHistoryStore.set(session.id, [
      {
        role: 'system',
        content: agentId
          ? `Mock session for agent "${agentId}". Set OPENCLAW_GATEWAY_TOKEN and deploy Prompt Smith for live generation.`
          : 'Mock OpenClaw session. Set OPENCLAW_GATEWAY_TOKEN to talk to the live gateway.',
        created_at: new Date().toISOString(),
      },
    ])
    return session
  }

  mockHistory(id: string): MockMessage[] {
    return this.mockHistoryStore.get(id) ?? []
  }

  mockReply(id: string, content: string): MockMessage {
    const history = this.mockHistoryStore.get(id) ?? []
    const userMsg: MockMessage = {
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    history.push(userMsg)

    const lower = content.toLowerCase()
    let replyText =
      'Got it. In live mode I would run this through OpenClaw. Try: "generate a prompt for …" or "draft a blog post about …".'

    if (lower.includes('prompt')) {
      const { target } = extractTargetAndBrief(content)
      const compiled = compilePromptLocally(content, { target })
      replyText =
        `Prompt Engineer · target=${compiled.target} · ${compiled.slug} · v${compiled.version} · ${compiled.model}\n\n` +
        '```markdown\n' +
        compiled.body.trim() +
        '\n```\n\n' +
        compiled.rationale
    } else if (lower.includes('blog')) {
      replyText =
        'I drafted a blog outline. Open the **Blog Generator** in the result pane to refine and push to Quartz.'
    } else if (lower.includes('docmost') || lower.includes('wiki')) {
      replyText = 'Opening Docmost in the result pane. Ask me to create or update a page once live.'
    } else if (lower.includes('silverbullet') || lower.includes('notes')) {
      replyText = 'Opening SilverBullet in the result pane.'
    } else if (lower.includes('quartz') || lower.includes('knowledge')) {
      replyText = 'Opening Quartz in the result pane.'
    }

    const assistantMsg: MockMessage = {
      role: 'assistant',
      content: replyText,
      created_at: new Date().toISOString(),
    }
    history.push(assistantMsg)
    this.mockHistoryStore.set(id, history)
    return assistantMsg
  }
}

let singleton: PortalGateway | null = null

export function getGateway(): PortalGateway {
  if (!singleton) singleton = new PortalGateway()
  return singleton
}
