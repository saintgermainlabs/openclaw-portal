import { useState } from 'react'
import { Link } from 'react-router'

const CATEGORIES = ['All', 'Geometry', 'Computation', 'Visualization', 'Planning']

const TOOLS = [
  {
    id: 'sacred-geometry-builder',
    name: 'Sacred Geometry Builder',
    description: 'Compose Flower of Life, Metatron\'s Cube, and related forms. Export as precise SVG with editable layers.',
    category: 'Geometry',
    status: 'live',
    complexity: 'High',
    href: '/site/tools/sacred-geometry',
    portalAppId: 'sacred-geometry',
  },
  {
    id: 'hex-lattice-explorer',
    name: 'Hex Lattice Explorer',
    description: 'Interactively map data onto hexagonal grids. Useful for tessellation analysis and distributed system topology diagrams.',
    category: 'Geometry',
    status: 'live',
    complexity: 'High',
    href: '/site/tools/hex-lattice',
    portalAppId: 'hex-lattice',
  },
  {
    id: 'fibonacci-spiral',
    name: 'Fibonacci Spiral Generator',
    description: 'Generate precise golden spirals, Fibonacci rectangles, and related logarithmic curves at arbitrary resolution.',
    category: 'Geometry',
    status: 'live',
    complexity: 'Medium',
    href: '/site/tools/fibonacci-spiral',
    portalAppId: 'fibonacci-spiral',
  },
  {
    id: 'dag-planner',
    name: 'DAG Planner',
    description: 'Visual directed-acyclic-graph editor for planning complex systems, knowledge graphs, and dependency maps.',
    category: 'Planning',
    status: 'live',
    complexity: 'High',
    href: '/site/tools/dag-planner',
    portalAppId: 'dag-planner',
  },
  {
    id: 'ritual-timer',
    name: 'Interval & Cycle Timer',
    description: 'Configurable interval timers for meditation, practice routines, and cyclic work patterns. Exports session logs.',
    category: 'Computation',
    status: 'planned',
    complexity: 'Low',
  },
  {
    id: 'svg-path-editor',
    name: 'SVG Path Composer',
    description: 'Low-level SVG path editor with a sacred geometry constraint palette — snap to circle intersections, golden ratios, and polygon vertices.',
    category: 'Visualization',
    status: 'planned',
    complexity: 'High',
  },
  {
    id: 'numerology-matrix',
    name: 'Numerological Matrix',
    description: 'Pythagorean and Chaldean reduction calculator with visual mapping of archetypal number relationships.',
    category: 'Computation',
    status: 'planned',
    complexity: 'Medium',
  },
  {
    id: 'mandala-renderer',
    name: 'Mandala Renderer',
    description: 'Parameterizable mandala generator. Set symmetry order, layer count, and motif type. Export as high-resolution SVG.',
    category: 'Visualization',
    status: 'planned',
    complexity: 'High',
  },
]

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'in-progress': {
    label: 'In Progress',
    color: 'var(--accent)',
    bg: 'rgba(201,153,58,0.1)',
    dot: 'var(--accent)',
  },
  planned: {
    label: 'Planned',
    color: 'var(--muted-foreground)',
    bg: 'rgba(122,116,153,0.08)',
    dot: 'var(--muted-foreground)',
  },
  live: {
    label: 'Live',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    dot: '#4ade80',
  },
}

export default function Tools({ onOpenTool }: { onOpenTool?: (portalAppId: string) => void }) {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = TOOLS.filter(t => activeCategory === 'All' || t.category === activeCategory)
  const inProgress = filtered.filter(t => t.status === 'in-progress')
  const planned = filtered.filter(t => t.status === 'planned')
  const live = filtered.filter(t => t.status === 'live')

  return (
    <div className="px-6 md:px-12 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="pt-16 pb-14" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-mono-data text-xs tracking-widest mb-5" style={{ color: 'var(--accent)' }}>
          — INSTRUMENTS
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="font-display text-4xl md:text-5xl mb-4">Tools</h1>
            <p className="text-base" style={{ color: 'var(--muted-foreground)', fontWeight: 300, maxWidth: '42ch' }}>
              Precision instruments for geometry, computation, and visualization. This page grows as each tool reaches a usable state.
            </p>
          </div>
          {/* Stats */}
          <div className="flex gap-8">
            {[
              { n: TOOLS.filter(t => t.status === 'live').length, label: 'Live' },
              { n: TOOLS.filter(t => t.status === 'in-progress').length, label: 'Building' },
              { n: TOOLS.filter(t => t.status === 'planned').length, label: 'Planned' },
            ].map(({ n, label }) => (
              <div key={label} className="text-right">
                <div className="font-display text-3xl" style={{ color: 'var(--foreground)' }}>{n}</div>
                <div className="font-mono-data text-xs tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 py-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="font-mono-data text-xs px-3.5 py-1.5 rounded-full tracking-widest uppercase transition-all"
            style={{
              backgroundColor: activeCategory === cat ? 'var(--primary)' : 'var(--card)',
              color: activeCategory === cat ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
              boxShadow: activeCategory === cat ? '0 0 12px rgba(124,109,250,0.3)' : 'none',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Live */}
      {live.length > 0 && (
        <Section title="Live" accent="#4ade80">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {live.map(tool => <ToolCard key={tool.id} tool={tool} onOpenTool={onOpenTool} />)}
          </div>
        </Section>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <Section title="Currently Building" accent="var(--accent)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {inProgress.map(tool => <ToolCard key={tool.id} tool={tool} highlight onOpenTool={onOpenTool} />)}
          </div>
        </Section>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <Section title="On the Horizon" accent="var(--muted-foreground)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {planned.map(tool => <ToolCard key={tool.id} tool={tool} onOpenTool={onOpenTool} />)}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-24 text-center">
          <p className="font-mono-data text-sm" style={{ color: 'var(--muted-foreground)' }}>No tools in this category yet.</p>
        </div>
      )}

      {/* Geometry ornament */}
      <div className="flex justify-center mt-20">
        <GeometryOrnament />
      </div>
    </div>
  )
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="font-mono-data text-xs tracking-widest uppercase" style={{ color: accent }}>{title}</h2>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      </div>
      {children}
    </div>
  )
}

type Tool = typeof TOOLS[number]

function ToolCard({
  tool,
  highlight,
  onOpenTool,
}: {
  tool: Tool
  highlight?: boolean
  onOpenTool?: (portalAppId: string) => void
}) {
  const meta = STATUS_META[tool.status]
  const href = 'href' in tool ? tool.href : undefined
  const portalAppId = 'portalAppId' in tool ? tool.portalAppId : undefined

  const openControl =
    tool.status === 'live' ? (
      onOpenTool && portalAppId ? (
        <button
          type="button"
          onClick={() => onOpenTool(portalAppId)}
          className="font-mono-data text-xs tracking-widest px-4 py-1.5 rounded-sm transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Open →
        </button>
      ) : href ? (
        <Link
          to={href}
          className="font-mono-data text-xs tracking-widest px-4 py-1.5 rounded-sm transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Open →
        </Link>
      ) : (
        <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Open
        </span>
      )
    ) : (
      <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>Coming soon</span>
    )

  return (
    <div
      className="card-glow p-6 rounded-sm"
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid ${highlight ? 'rgba(201,153,58,0.3)' : 'var(--border)'}`,
        boxShadow: highlight ? '0 0 20px rgba(201,153,58,0.06)' : 'none',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ backgroundColor: meta.dot }} />
          <span
            className="font-mono-data text-[10px] px-2 py-0.5 rounded-full tracking-widest uppercase"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        <ComplexityBadge complexity={tool.complexity} />
      </div>

      {/* Tool icon */}
      <ToolIcon id={tool.id} />

      <h3 className="font-display text-base mb-2 mt-4 leading-snug" style={{ color: 'var(--foreground)' }}>
        {tool.name}
      </h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
        {tool.description}
      </p>

      <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <span
          className="font-mono-data text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
          style={{ backgroundColor: 'rgba(124,109,250,0.08)', color: 'var(--primary)' }}
        >
          {tool.category}
        </span>
        {openControl}
      </div>
    </div>
  )
}

function ComplexityBadge({ complexity }: { complexity: string }) {
  const bars = complexity === 'Low' ? 1 : complexity === 'Medium' ? 2 : 3
  return (
    <div className="flex items-end gap-0.5" title={`Complexity: ${complexity}`}>
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className="w-1 rounded-sm"
          style={{
            height: `${n * 4}px`,
            backgroundColor: n <= bars ? 'var(--primary)' : 'var(--border)',
            opacity: n <= bars ? 0.8 : 0.3,
          }}
        />
      ))}
    </div>
  )
}

function ToolIcon({ id }: { id: string }) {
  const icons: Record<string, React.ReactNode> = {
    'sacred-geometry-builder': (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="12" stroke="var(--accent)" strokeWidth="0.8" fill="none" opacity="0.6" />
        <circle cx="26" cy="20" r="12" stroke="var(--primary)" strokeWidth="0.8" fill="none" opacity="0.4" />
        <circle cx="14" cy="20" r="12" stroke="var(--primary)" strokeWidth="0.8" fill="none" opacity="0.4" />
        <circle cx="20" cy="20" r="2" fill="var(--accent)" opacity="0.8" />
      </svg>
    ),
    'hex-lattice-explorer': (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {[[20,20],[10,14.6],[10,25.4],[20,31.1],[30,25.4],[30,14.6]].map(([x,y],i) => (
          <polygon key={i} points={`${x},${y-6} ${x+5.2},${y-3} ${x+5.2},${y+3} ${x},${y+6} ${x-5.2},${y+3} ${x-5.2},${y-3}`}
            stroke="var(--primary)" strokeWidth="0.6" fill="none" opacity={i === 0 ? 0.8 : 0.35} />
        ))}
      </svg>
    ),
    default: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="8" width="24" height="24" rx="1" stroke="var(--primary)" strokeWidth="0.8" fill="none" opacity="0.5" />
        <line x1="8" y1="20" x2="32" y2="20" stroke="var(--accent)" strokeWidth="0.5" opacity="0.5" />
        <line x1="20" y1="8" x2="20" y2="32" stroke="var(--accent)" strokeWidth="0.5" opacity="0.5" />
        <circle cx="20" cy="20" r="3" stroke="var(--primary)" strokeWidth="0.8" fill="none" />
      </svg>
    ),
  }
  return <div>{icons[id] ?? icons.default}</div>
}

function GeometryOrnament() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="55" stroke="rgba(124,109,250,0.1)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="40" stroke="rgba(201,153,58,0.15)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="25" stroke="rgba(124,109,250,0.2)" strokeWidth="0.5" />
      {[0, 60, 120, 180, 240, 300].map((a, i) => (
        <polygon
          key={i}
          points={`60,${60 - 40} ${60 + 34.6},${60 + 20} ${60 - 34.6},${60 + 20}`}
          stroke="rgba(124,109,250,0.12)"
          strokeWidth="0.5"
          fill="none"
          transform={`rotate(${a} 60 60)`}
        />
      ))}
      <circle cx="60" cy="60" r="3" fill="var(--accent)" opacity="0.7" />
    </svg>
  )
}
