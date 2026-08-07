import { useEffect, useRef, useState } from 'react'
import { usePortal } from './PortalContext'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
}

type Status = {
  connected: boolean
  mock?: boolean
  gateway_url?: string
  error?: string
  pairingRequired?: boolean
  hint?: string
}

function inferAppFromText(text: string): string | null {
  const t = text.toLowerCase()
  if (t.includes('prompt')) return 'prompt-generator'
  if (t.includes('blog')) return 'blog-generator'
  if (t.includes('docmost') || t.includes('wiki')) return 'docmost'
  if (t.includes('silverbullet') || t.includes('notes')) return 'silverbullet'
  if (t.includes('quartz') || t.includes('knowledge garden')) return 'quartz'
  if (t.includes('tool')) return 'tools'
  return null
}

export default function ChatPane() {
  const { sessionId, setSessionId, showApp, showMarkdown } = usePortal()
  const [status, setStatus] = useState<Status | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/openclaw/status')
        const data = await res.json()
        if (!cancelled) setStatus(data)
      } catch {
        if (!cancelled) setStatus({ connected: false, error: 'API unreachable' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (sessionId) return
      try {
        const listRes = await fetch('/api/openclaw/sessions')
        const listData = await listRes.json()
        const existing = listData.sessions?.[0]
        if (existing?.id) {
          if (!cancelled) setSessionId(existing.id)
          return
        }
        const createRes = await fetch('/api/openclaw/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Portal workspace' }),
        })
        const created = await createRes.json()
        if (!cancelled && created.session?.id) setSessionId(created.session.id)
      } catch {
        /* status banner covers this */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, setSessionId])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/openclaw/sessions/${sessionId}/history`)
        const data = await res.json()
        if (!cancelled) setMessages(Array.isArray(data.messages) ? data.messages : [])
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const content = input.trim()
    if (!content || !sessionId || sending) return
    setSending(true)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content, created_at: new Date().toISOString() }])

    try {
      const res = await fetch(`/api/openclaw/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()

      if (data.compiled?.body) {
        showMarkdown(data.compiled.title, data.compiled.body)
        showApp('prompt-generator')
      }

      if (data.reply?.content) {
        setMessages((m) => [...m, data.reply])
        const fence = String(data.reply.content).match(/```(?:markdown)?\n([\s\S]*?)```/)
        if (fence) {
          showMarkdown('Compiled prompt', fence[1].trim())
          showApp('prompt-generator')
        }
      } else {
        // Live gateway: refresh history shortly after send
        setTimeout(async () => {
          const hist = await fetch(`/api/openclaw/sessions/${sessionId}/history`)
          const histData = await hist.json()
          if (Array.isArray(histData.messages)) setMessages(histData.messages)
        }, 800)
      }

      const appId = inferAppFromText(content) || (data.reply?.content ? inferAppFromText(data.reply.content) : null)
      if (appId && !data.compiled) showApp(appId)
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Send failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const connected = status?.connected || status?.mock

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--card)' }}>
      <header
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <p className="font-display text-sm tracking-widest uppercase" style={{ letterSpacing: '0.18em' }}>
            OpenClaw
          </p>
          <p className="font-mono-data text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {status?.gateway_url ?? 'gateway'}
          </p>
        </div>
        <span
          className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm flex items-center gap-1.5"
          style={{
            border: '1px solid var(--border)',
            color: status?.mock ? '#f0b429' : connected ? 'var(--accent)' : 'var(--muted-foreground)',
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: status?.mock ? '#f0b429' : connected ? 'var(--accent)' : 'var(--muted-foreground)',
            }}
          />
          {status?.mock ? 'mock' : status?.connected ? 'live' : 'offline'}
        </span>
      </header>

      {status?.mock && (
        <div
          className="px-4 py-2 text-xs leading-relaxed"
          style={{
            backgroundColor: 'rgba(240,180,41,0.12)',
            borderBottom: '1px solid rgba(240,180,41,0.35)',
            color: '#e8d5a3',
          }}
        >
          <strong>Not connected to OpenClaw.</strong> No{' '}
          <span className="font-mono-data">OPENCLAW_GATEWAY_TOKEN</span> — chat uses the local mock
          compiler. Run <span className="font-mono-data">./scripts/sync-env-from-openclaw.sh</span> and
          restart.
        </div>
      )}
      {status?.pairingRequired && (
        <div
          className="px-4 py-2 text-xs leading-relaxed"
          style={{
            backgroundColor: 'rgba(124,109,250,0.15)',
            borderBottom: '1px solid rgba(124,109,250,0.35)',
            color: 'var(--secondary-foreground)',
          }}
        >
          <strong>Device pairing required.</strong> Open{' '}
          <a
            href="https://openclaw.tiger-bushmaster.ts.net"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--primary)' }}
          >
            openclaw.tiger-bushmaster.ts.net
          </a>{' '}
          → approve the pending <em>OpenClaw Portal</em> device, then refresh this page.
          {status.hint ? ` ${status.hint}` : ''}
        </div>
      )}
      {status && !status.connected && !status.mock && !status.pairingRequired && (
        <div
          className="px-4 py-2 text-xs"
          style={{ backgroundColor: 'rgba(220,80,80,0.12)', borderBottom: '1px solid rgba(220,80,80,0.35)' }}
        >
          Gateway unreachable: {status.error || 'unknown error'} ({status.gateway_url})
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            Ask OpenClaw to generate a prompt, draft a blog post, or open Docmost / Quartz / SilverBullet in the
            result pane.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}-${msg.created_at ?? i}`}
            className="text-sm leading-relaxed rounded-sm px-3 py-2"
            style={{
              backgroundColor:
                msg.role === 'user'
                  ? 'rgba(124,109,250,0.12)'
                  : msg.role === 'system'
                    ? 'transparent'
                    : 'var(--secondary)',
              border: msg.role === 'system' ? '1px dashed var(--border)' : '1px solid var(--border)',
              color: msg.role === 'system' ? 'var(--muted-foreground)' : 'var(--foreground)',
            }}
          >
            <p className="font-mono-data text-[10px] uppercase mb-1" style={{ color: 'var(--muted-foreground)' }}>
              {msg.role}
            </p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-3 flex gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message OpenClaw…"
          disabled={sending || !sessionId}
          className="flex-1 rounded-sm px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !sessionId}
          className="font-mono-data text-xs uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-40"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
