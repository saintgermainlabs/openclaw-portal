import { useEffect, useState } from 'react'
import { usePortal } from '../PortalContext'

type AgentInfo = { agentId: string; model: string; targets: string[] }

type Compiled = {
  title: string
  slug: string
  status: string
  version: number
  body: string
  rationale: string
  agentId: string
  model: string
  target: string
  mock: boolean
}

const TARGETS = [
  { id: 'auto', label: 'Auto' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'openclaw', label: 'OpenClaw' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'figma', label: 'Figma' },
  { id: 'lovable', label: 'Lovable' },
  { id: 'research', label: 'Research' },
  { id: 'infra', label: 'Infra' },
]

export default function PromptGenerator() {
  const { showMarkdown } = usePortal()
  const [agent, setAgent] = useState<AgentInfo | null>(null)
  const [target, setTarget] = useState('auto')
  const [brief, setBrief] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [meta, setMeta] = useState<Omit<Compiled, 'body' | 'title'> | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/prompts/agent')
      .then((r) => r.json())
      .then((d) =>
        setAgent({
          agentId: d.agentId,
          model: d.model,
          targets: d.targets ?? TARGETS.map((t) => t.id),
        }),
      )
      .catch(() => setAgent(null))
  }, [])

  async function generate() {
    if (!brief.trim()) {
      setStatus('Describe what the prompt should do.')
      return
    }
    setGenerating(true)
    setStatus(null)
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: brief.trim(),
          title: title.trim() || undefined,
          target,
        }),
      })
      const data = await res.json()
      if (!res.ok && !data.compiled) throw new Error(data.error || 'Generate failed')
      const compiled = data.compiled as Compiled
      setTitle(compiled.title)
      setBody(compiled.body)
      if (compiled.target) setTarget(compiled.target)
      setMeta({
        slug: compiled.slug,
        status: compiled.status,
        version: compiled.version,
        rationale: compiled.rationale,
        agentId: compiled.agentId,
        model: compiled.model,
        target: compiled.target,
        mock: compiled.mock,
      })
      setStatus(
        data.error
          ? data.error
          : compiled.mock
            ? `Local compiler · ${compiled.target} · ${compiled.model}`
            : `Prompt Engineer · ${compiled.target} · ${compiled.model}`,
      )
      showMarkdown(compiled.title, compiled.body)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Generate failed')
    } finally {
      setGenerating(false)
    }
  }

  async function saveArtifact() {
    if (!body.trim()) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'prompt',
          title: title || 'Untitled prompt',
          body,
          appId: 'prompt-generator',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setStatus(`Saved ${data.artifact.id.slice(0, 8)} — ask chat to publish via prompt-workshop`)
      showMarkdown(title || 'Untitled prompt', body)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 max-w-3xl">
      <p className="font-mono-data text-xs tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
        AGENT · PROMPT ENGINEER
      </p>
      <h2 className="font-display text-2xl mb-2">Prompt Generator</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
        Specialist agent <span className="font-mono-data">{agent?.agentId ?? 'prompt-engineer'}</span> on{' '}
        <span className="font-mono-data">{agent?.model ?? '…'}</span>. Pick the <em>executor</em> target — the
        prompt shape changes for Cursor vs OpenClaw vs Figma.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {TARGETS.map((t) => {
          const active = target === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTarget(t.id)}
              className="font-mono-data text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-sm"
              style={{
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                backgroundColor: active ? 'rgba(124,109,250,0.1)' : 'transparent',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <label className="block mb-4">
        <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          Brief
        </span>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder="e.g. Add inventory list caching with 30s TTL — inspect existing data layer first"
          className="mt-1 w-full rounded-sm px-3 py-2 text-sm outline-none resize-y"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </label>

      <label className="block mb-4">
        <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          Title (optional)
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-sm px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating || !brief.trim()}
          className="font-mono-data text-xs uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-40"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          {generating ? 'Draft → critique → revise…' : 'Generate (with critique pass)'}
        </button>
        <button
          type="button"
          onClick={() => void saveArtifact()}
          disabled={saving || !body.trim()}
          className="font-mono-data text-xs uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-40"
          style={{ border: '1px solid var(--border)', color: 'var(--secondary-foreground)' }}
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        {meta && (
          <span className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
            {meta.target} · {meta.slug} · v{meta.version}
            {meta.mock ? ' · local' : ' · live'}
          </span>
        )}
      </div>

      {status && (
        <p className="text-xs mb-4 font-mono-data" style={{ color: 'var(--muted-foreground)' }}>
          {status}
        </p>
      )}

      {meta?.rationale && (
        <p className="text-sm mb-4" style={{ color: 'var(--secondary-foreground)' }}>
          {meta.rationale}
        </p>
      )}

      <label className="block mb-4">
        <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
          Executable prompt
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={22}
          placeholder="Generated prompt appears here…"
          className="mt-1 w-full rounded-sm px-3 py-2 text-sm font-mono-data outline-none resize-y"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </label>
    </div>
  )
}
