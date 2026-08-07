import { useEffect, useState } from 'react'
import { usePortal } from './PortalContext'
import PromptGenerator from './apps/PromptGenerator'
import BlogGenerator from './apps/BlogGenerator'
import SacredGeometryBuilder from '@/tools/SacredGeometryBuilder'
import HexLatticeExplorer from '@/tools/HexLatticeExplorer'
import FibonacciSpiralGenerator from '@/tools/FibonacciSpiralGenerator'
import DagPlanner from '@/tools/DagPlanner'
import Tools from '@/pages/Tools'
import KnowledgeBase from '@/pages/KnowledgeBase'
import Blog from '@/pages/Blog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type AppMeta = {
  id: string
  label: string
  description: string
  kind: 'native' | 'iframe' | 'link'
  view?: string
  url?: string
}

export default function ResultPane() {
  const { result, showApp, clearResult } = usePortal()
  const [apps, setApps] = useState<AppMeta[]>([])

  useEffect(() => {
    fetch('/api/apps')
      .then((r) => r.json())
      .then((d) => setApps(d.apps ?? []))
      .catch(() => setApps([]))
  }, [])

  const activeApp = result.type === 'app' ? apps.find((a) => a.id === result.appId) : undefined

  return (
    <div className="flex h-full flex-col min-w-0" style={{ backgroundColor: 'var(--background)' }}>
      <header
        className="flex items-center gap-2 px-3 py-2 overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {apps.map((app) => {
          const active = result.type === 'app' && result.appId === app.id
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => showApp(app.id)}
              className="font-mono-data text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-sm whitespace-nowrap transition-colors"
              style={{
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                backgroundColor: active ? 'rgba(124,109,250,0.1)' : 'transparent',
              }}
            >
              {app.label}
            </button>
          )
        })}
        {result.type !== 'empty' && (
          <button
            type="button"
            onClick={clearResult}
            className="ml-auto font-mono-data text-[10px] uppercase tracking-wider px-2 py-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Clear
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {result.type === 'empty' && <EmptyState onPick={showApp} apps={apps} />}
        {result.type === 'markdown' && (
          <div className="h-full overflow-y-auto px-8 py-6 prose-portal">
            <h1 className="font-display text-2xl mb-4">{result.title}</h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.body}</ReactMarkdown>
          </div>
        )}
        {result.type === 'app' && activeApp && <AppSurface app={activeApp} />}
        {result.type === 'app' && !activeApp && apps.length > 0 && (
          <div className="p-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Unknown app: {result.appId}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ apps, onPick }: { apps: AppMeta[]; onPick: (id: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center sacred-bg">
      <p className="font-mono-data text-xs tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
        RESULT PANE
      </p>
      <h2 className="font-display text-3xl mb-3">OpenClaw Portal</h2>
      <p className="text-sm max-w-md mb-8" style={{ color: 'var(--muted-foreground)' }}>
        Chat on the left. Generators and connected apps render here — Docmost, Quartz, SilverBullet, and native React
        tools.
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {apps.slice(0, 6).map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => onPick(app.id)}
            className="font-mono-data text-xs uppercase tracking-wider px-3 py-2 rounded-sm"
            style={{ border: '1px solid var(--border)', color: 'var(--secondary-foreground)' }}
          >
            {app.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AppSurface({ app }: { app: AppMeta }) {
  const { showApp } = usePortal()

  if (app.kind === 'iframe' && app.url) {
    return <IframeApp app={app} />
  }

  switch (app.view) {
    case 'prompt-generator':
      return <PromptGenerator />
    case 'blog-generator':
      return <BlogGenerator />
    case 'sacred-geometry':
      return (
        <div className="h-full overflow-y-auto">
          <SacredGeometryBuilder compact embedded />
        </div>
      )
    case 'hex-lattice':
      return (
        <div className="h-full overflow-y-auto">
          <HexLatticeExplorer compact embedded />
        </div>
      )
    case 'fibonacci-spiral':
      return (
        <div className="h-full overflow-y-auto">
          <FibonacciSpiralGenerator compact embedded />
        </div>
      )
    case 'dag-planner':
      return (
        <div className="h-full overflow-y-auto">
          <DagPlanner compact embedded />
        </div>
      )
    case 'tools':
      return (
        <div className="h-full overflow-y-auto">
          <Tools onOpenTool={showApp} />
        </div>
      )
    case 'knowledge':
      return (
        <div className="h-full overflow-y-auto">
          <KnowledgeBase />
        </div>
      )
    case 'blog':
      return (
        <div className="h-full overflow-y-auto">
          <Blog />
        </div>
      )
    default:
      return (
        <div className="p-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {app.description}
        </div>
      )
  }
}

function IframeApp({ app }: { app: AppMeta }) {
  const [reach, setReach] = useState<{
    ok?: boolean
    embedBlocked?: boolean
    hint?: string
    error?: string
    status?: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/apps/${app.id}/reachability`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setReach(d)
      })
      .catch(() => {
        if (!cancelled) setReach({ ok: false, error: 'probe failed' })
      })
    return () => {
      cancelled = true
    }
  }, [app.id])

  const showEmbedWarning = reach && (reach.embedBlocked || reach.ok === false)

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
      >
        <div className="min-w-0">
          <p className="font-display text-sm">{app.label}</p>
          <p className="font-mono-data text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>
            {app.url}
            {reach?.ok === true && ' · reachable'}
            {reach?.ok === false && ' · unreachable from portal'}
            {reach?.embedBlocked && ' · blocks iframes'}
          </p>
        </div>
        <a
          href={app.url}
          target="_blank"
          rel="noreferrer"
          className="font-mono-data text-[10px] uppercase tracking-wider shrink-0 px-2 py-1 rounded-sm"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Open ↗
        </a>
      </div>

      {showEmbedWarning && (
        <div
          className="px-4 py-3 text-sm shrink-0"
          style={{
            backgroundColor: 'rgba(240,180,41,0.1)',
            borderBottom: '1px solid rgba(240,180,41,0.3)',
            color: 'var(--secondary-foreground)',
          }}
        >
          <p className="mb-1">
            {reach?.ok === false
              ? `Portal cannot reach ${app.label} (${reach.error || 'network error'}).`
              : `${app.label} is up but likely refuses to be embedded (X-Frame-Options / CSP).`}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {reach?.hint || 'Use Open ↗ — embedding is separate from whether the Tailnet app is healthy.'}
          </p>
        </div>
      )}

      <iframe
        title={app.label}
        src={app.url}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
