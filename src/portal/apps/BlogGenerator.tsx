import { useState } from 'react'
import { usePortal } from '../PortalContext'

export default function BlogGenerator() {
  const { showMarkdown } = usePortal()
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('Practice')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function save() {
    setStatus(null)
    const markdown = `---
title: ${title || 'Untitled'}
tag: ${tag}
excerpt: ${excerpt}
date: ${new Date().toISOString().slice(0, 10)}
---

${body}
`
    try {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'blog',
          title: title || 'Untitled post',
          body: markdown,
          appId: 'blog-generator',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setStatus(`Saved ${data.artifact.id.slice(0, 8)} — ask OpenClaw to publish to Quartz`)
      showMarkdown(title || 'Untitled post', body || excerpt)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 max-w-3xl">
      <p className="font-mono-data text-xs tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
        NATIVE · LIVING ARCHIVE
      </p>
      <h2 className="font-display text-2xl mb-2">Blog Generator</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
        Compose in React, then hand off to OpenClaw to file into Quartz or Docmost.
      </p>

      <div className="grid gap-4 mb-4">
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Tag" value={tag} onChange={setTag} />
        <Field label="Excerpt" value={excerpt} onChange={setExcerpt} />
        <label className="block">
          <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
            Body
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            className="mt-1 w-full rounded-sm px-3 py-2 text-sm outline-none resize-y"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          className="font-mono-data text-xs uppercase tracking-wider px-4 py-2 rounded-sm"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Save draft
        </button>
        {status && (
          <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {status}
          </span>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm px-3 py-2 text-sm outline-none"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      />
    </label>
  )
}
