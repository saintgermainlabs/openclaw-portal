import './load-env.js'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { getGateway } from './openclaw.js'
import { APP_REGISTRY, resolveAppUrl } from './apps.js'
import { getInventorySnapshot } from './inventory.js'
import { tailnetFetch, ensureTailnetNoProxy } from './tailnet.js'
import {
  PROMPT_ENGINEER_AGENT_ID,
  PROMPT_ENGINEER_MODEL,
  buildPromptEngineerInstruction,
  compilePromptLocally,
  extractTargetAndBrief,
  parseTarget,
  type PromptTarget,
} from './prompt-engineer.js'

const API_PORT = Number(process.env.API_PORT || 8787)
const isProd = process.env.NODE_ENV === 'production'

const app = new Hono()

const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use('/api/*', cors({ origin: CORS_ORIGINS }))

app.use('*', async (c, next) => {
  await next()
  const res = c.res
  if (!res.headers.has('X-Content-Type-Options')) res.headers.set('X-Content-Type-Options', 'nosniff')
  if (!res.headers.has('Referrer-Policy')) res.headers.set('Referrer-Policy', 'no-referrer')
  if (!res.headers.has('X-Frame-Options')) res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  if (!res.headers.has('Permissions-Policy')) {
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }
})

if (isProd) {
  app.use('*', async (c, next) => {
    await next()
    c.res.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' wss: https:",
        "frame-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    )
  })
}

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  console.log(
    `[openclaw-portal] ${c.req.method} ${c.req.url} -> ${c.res.status} ${Date.now() - start}ms`,
  )
})

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'openclaw-portal',
    domain: 'openclaw-portal',
    promptEngineer: { agentId: PROMPT_ENGINEER_AGENT_ID, model: PROMPT_ENGINEER_MODEL },
  }),
)

app.get('/api/openclaw/status', async (c) => {
  const gateway = getGateway()
  if (gateway.mockMode) {
    return c.json({
      connected: true,
      mock: true,
      gateway_url: gateway.publicUrl,
      sessions_count: gateway.mockSessions().length,
    })
  }
  try {
    await gateway.ensureConnected()
    const sessions = await gateway.call<unknown[]>('sessions.list', {}).catch(() => [])
    return c.json({
      connected: true,
      mock: false,
      gateway_url: gateway.publicUrl,
      sessions_count: Array.isArray(sessions) ? sessions.length : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway unavailable'
    const pairingRequired = /pairing required/i.test(message)
    return c.json({
      connected: false,
      mock: false,
      gateway_url: gateway.publicUrl,
      error: message,
      pairingRequired,
      hint: pairingRequired
        ? 'Open https://openclaw.tiger-bushmaster.ts.net → approve the pending device for OpenClaw Portal, then refresh'
        : undefined,
    })
  }
})

app.get('/api/openclaw/sessions', async (c) => {
  const gateway = getGateway()
  try {
    await gateway.ensureConnected()
    const sessions = await gateway.call('sessions.list', {})
    return c.json({ sessions })
  } catch (err) {
    if (gateway.mockMode) {
      return c.json({ sessions: gateway.mockSessions(), mock: true })
    }
    return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 503)
  }
})

app.post('/api/openclaw/sessions', async (c) => {
  const gateway = getGateway()
  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const agentId = (body.agentId as string) || undefined
  try {
    await gateway.ensureConnected()
    const session = await gateway.call('sessions.create', {
      ...body,
      agentId,
    })
    return c.json({ session })
  } catch (err) {
    if (gateway.mockMode) {
      const session = gateway.createMockSession(
        (body.title as string) || undefined,
        agentId || PROMPT_ENGINEER_AGENT_ID,
      )
      return c.json({ session, mock: true })
    }
    return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 503)
  }
})

app.get('/api/openclaw/sessions/:id/history', async (c) => {
  const gateway = getGateway()
  const id = c.req.param('id')
  try {
    await gateway.ensureConnected()
    const history = await gateway.call('sessions.history', { session_id: id })
    return c.json({ messages: history })
  } catch (err) {
    if (gateway.mockMode) {
      return c.json({ messages: gateway.mockHistory(id), mock: true })
    }
    return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 503)
  }
})

app.post('/api/openclaw/sessions/:id/messages', async (c) => {
  const gateway = getGateway()
  const id = c.req.param('id')
  const body = await c.req.json()
  const content = body?.content
  if (!content || typeof content !== 'string') {
    return c.json({ error: 'content is required' }, 400)
  }

  const wantsPrompt = /\bprompt\b|^\s*\/prompt\b/i.test(content)
  const { target } = extractTargetAndBrief(content)
  const payload = wantsPrompt
    ? buildPromptEngineerInstruction(content, { target })
    : `[OpenClaw Portal] ${content}`

  try {
    await gateway.ensureConnected()
    const chatParams: Record<string, unknown> = {
      sessionKey: id,
      message: payload,
    }
    if (wantsPrompt) {
      chatParams.agentId = PROMPT_ENGINEER_AGENT_ID
      chatParams.model = PROMPT_ENGINEER_MODEL
    }
    try {
      await gateway.call('chat.send', chatParams)
    } catch {
      await gateway.call('sessions.send', { session_id: id, content: payload })
    }
    return c.json({
      success: true,
      routedTo: wantsPrompt ? PROMPT_ENGINEER_AGENT_ID : 'default',
      model: wantsPrompt ? PROMPT_ENGINEER_MODEL : undefined,
      target: wantsPrompt ? target : undefined,
    })
  } catch (err) {
    if (gateway.mockMode) {
      const reply = gateway.mockReply(id, content)
      return c.json({
        success: true,
        mock: true,
        reply,
        routedTo: wantsPrompt ? PROMPT_ENGINEER_AGENT_ID : 'default',
        compiled: wantsPrompt ? compilePromptLocally(content, { target }) : undefined,
        target: wantsPrompt ? target : undefined,
      })
    }
    return c.json({ error: err instanceof Error ? err.message : 'Failed' }, 503)
  }
})

/** Dedicated Prompt Engineer generation endpoint (UI + chat both use this). */
app.post('/api/prompts/generate', async (c) => {
  const gateway = getGateway()
  const body = await c.req.json().catch(() => ({}))
  const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : undefined
  const target = (parseTarget(body.target) || 'auto') as PromptTarget
  if (!brief) return c.json({ error: 'brief is required' }, 400)

  const instruction = buildPromptEngineerInstruction(brief, { title, target })

  if (gateway.mockMode) {
    const compiled = compilePromptLocally(brief, { title, target })
    return c.json({ compiled, mock: true })
  }

  try {
    await gateway.ensureConnected()
    const sessionKey = `agent:${PROMPT_ENGINEER_AGENT_ID}:portal`

    try {
      await gateway.call('chat.send', {
        sessionKey,
        message: instruction,
        agentId: PROMPT_ENGINEER_AGENT_ID,
        model: PROMPT_ENGINEER_MODEL,
      })
    } catch {
      await gateway.call('sessions.send', {
        session_id: sessionKey,
        content: instruction,
      })
    }

    // Best-effort: wait briefly then pull history for the assistant reply
    await new Promise((r) => setTimeout(r, 1500))
    let replyText = ''
    try {
      const history = (await gateway.call<unknown>('sessions.history', {
        session_id: sessionKey,
      })) as Array<{ role?: string; content?: string }>
      const lastAssistant = [...(Array.isArray(history) ? history : [])]
        .reverse()
        .find((m) => m.role === 'assistant' && m.content)
      replyText = lastAssistant?.content || ''
    } catch {
      /* agent may still be generating */
    }

    const fence = replyText.match(/```(?:markdown)?\n([\s\S]*?)```/)
    const compiled = fence
      ? {
          title: title || brief.slice(0, 80),
          slug: 'from-agent',
          status: 'draft' as const,
          version: 1,
          body: fence[1].trim() + '\n',
          rationale: 'Generated by Prompt Engineer agent (critique/revise applied in-agent)',
          agentId: PROMPT_ENGINEER_AGENT_ID,
          model: PROMPT_ENGINEER_MODEL,
          target,
          mock: false,
        }
      : compilePromptLocally(brief, { title, target })

    if (!fence) {
      compiled.rationale =
        'Agent acknowledged but no fenced prompt yet — local scaffold returned. Check chat history / retry.'
      compiled.mock = false
    }

    return c.json({
      compiled,
      sessionKey,
      agentId: PROMPT_ENGINEER_AGENT_ID,
      model: PROMPT_ENGINEER_MODEL,
      target,
      rawReply: replyText || undefined,
    })
  } catch (err) {
    const compiled = compilePromptLocally(brief, { title, target })
    return c.json({
      compiled,
      mock: true,
      error: err instanceof Error ? err.message : 'Gateway failed; used local compiler',
    })
  }
})

app.get('/api/prompts/agent', (c) =>
  c.json({
    agentId: PROMPT_ENGINEER_AGENT_ID,
    model: PROMPT_ENGINEER_MODEL,
    workspace: 'agents/prompt-engineer',
    targets: ['auto', 'cursor', 'openclaw', 'figma', 'lovable', 'claude-code', 'research', 'infra', 'generic'],
  }),
)

app.get('/api/diagnostics/tailnet', async (c) => {
  ensureTailnetNoProxy()
  const targets = [
    process.env.OPENCLAW_HTTP_URL || 'https://openclaw.tiger-bushmaster.ts.net',
    process.env.DOCMOST_URL || 'https://docmost.tiger-bushmaster.ts.net',
    process.env.QUARTZ_URL || 'https://quartz.tiger-bushmaster.ts.net',
    process.env.SILVERBULLET_URL || 'https://silverbullet.tiger-bushmaster.ts.net',
  ]

  const results = []
  for (const target of targets) {
    let hostname = target
    try {
      hostname = new URL(target).hostname
    } catch {
      /* keep */
    }
    let resolved: string | null = null
    try {
      const { lookup } = await import('node:dns/promises')
      resolved = (await lookup(hostname)).address
    } catch {
      resolved = null
    }
    let https: { ok: boolean; status?: number; error?: string } = { ok: false }
    try {
      const res = await tailnetFetch(target, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      })
      https = { ok: res.status > 0 && res.status < 500, status: res.status }
    } catch (err) {
      https = { ok: false, error: err instanceof Error ? err.message : 'fail' }
    }
    results.push({
      url: target,
      hostname,
      resolved,
      viaTailnet: !!resolved?.startsWith('100.'),
      https,
    })
  }

  return c.json({
    noProxy: process.env.NO_PROXY || process.env.no_proxy,
    httpProxySet: !!(process.env.HTTPS_PROXY || process.env.https_proxy),
    results,
    note: 'OpenClaw chat uses wss://… over Tailnet MagicDNS. Device pairing is separate from routing.',
  })
})

app.get('/api/inventory', async (c) => c.json(await getInventorySnapshot()))

app.get('/api/apps', (c) => {
  return c.json({
    apps: APP_REGISTRY.map((a) => ({
      ...a,
      url: resolveAppUrl(a.id),
    })),
  })
})

app.get('/api/apps/:id', (c) => {
  const id = c.req.param('id')
  const appMeta = APP_REGISTRY.find((a) => a.id === id)
  if (!appMeta) return c.json({ error: 'Unknown app' }, 404)
  return c.json({ ...appMeta, url: resolveAppUrl(id) })
})

app.get('/api/apps/:id/reachability', async (c) => {
  const id = c.req.param('id')
  const url = resolveAppUrl(id)
  if (!url) return c.json({ ok: false, error: 'No URL configured for app', id }, 404)

  try {
    const res = await tailnetFetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'openclaw-portal/0.1' },
    })
    const xfo = res.headers.get('x-frame-options')
    const csp = res.headers.get('content-security-policy') || ''
    const frameAncestors = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1]?.trim()
    const embedBlocked =
      (!!xfo && /deny|sameorigin/i.test(xfo)) ||
      (frameAncestors != null && !/\*/.test(frameAncestors))

    return c.json({
      ok: res.status > 0 && res.status < 500,
      status: res.status,
      url,
      embedBlocked,
      xFrameOptions: xfo,
      frameAncestors: frameAncestors || null,
      hint: embedBlocked
        ? 'App is reachable but likely blocks iframe embedding — use Open ↗'
        : res.status >= 400
          ? 'App responded with an error status'
          : 'Reachable',
    })
  } catch (err) {
    return c.json({
      ok: false,
      url,
      error: err instanceof Error ? err.message : 'unreachable',
      hint: 'Host cannot reach this Tailnet URL from the portal process',
    })
  }
})

// Result artifacts pushed by chat / tools (in-memory for now)
type Artifact = {
  id: string
  kind: 'markdown' | 'prompt' | 'blog' | 'link' | 'html'
  title: string
  body: string
  appId?: string
  createdAt: string
}

const artifacts = new Map<string, Artifact>()

app.get('/api/artifacts', (c) => {
  const list = Array.from(artifacts.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  return c.json({ artifacts: list })
})

app.post('/api/artifacts', async (c) => {
  const body = await c.req.json()
  const artifact: Artifact = {
    id: crypto.randomUUID(),
    kind: body.kind ?? 'markdown',
    title: body.title ?? 'Untitled',
    body: body.body ?? '',
    appId: body.appId,
    createdAt: new Date().toISOString(),
  }
  artifacts.set(artifact.id, artifact)
  return c.json({ artifact }, 201)
})

app.get('/api/artifacts/:id', (c) => {
  const artifact = artifacts.get(c.req.param('id'))
  if (!artifact) return c.json({ error: 'Not found' }, 404)
  return c.json({ artifact })
})

if (isProd) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

console.log(`[openclaw-portal] API listening on :${API_PORT} (prod=${isProd})`)
if (!process.env.OPENCLAW_GATEWAY_TOKEN) {
  console.warn(
    '[openclaw-portal] OPENCLAW_GATEWAY_TOKEN unset — mock mode. Run ./scripts/sync-env-from-openclaw.sh',
  )
}
serve({ fetch: app.fetch, port: API_PORT, hostname: '0.0.0.0' })

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    console.log(`[openclaw-portal] ${signal} received — shutting down`)
    // Give in-flight requests a moment, then exit. @hono/node-server keeps sockets alive.
    setTimeout(() => process.exit(0), 250).unref()
  })
}
