import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  type DagGraph,
  type DagNode,
  sampleGraph,
  emptyGraph,
  createId,
  wouldCreateCycle,
  layoutGraph,
  ancestors,
  descendants,
  graphBounds,
  edgePath,
  downloadText,
  serializeGraph,
  parseGraph,
  topologicalOrder,
  STATUS_COLOR,
} from '@/lib/dag'

type Props = {
  compact?: boolean
  embedded?: boolean
}

type Mode = 'select' | 'add' | 'connect' | 'delete'

const NODE_W = 128
const NODE_H = 44
const BG = '#06060f'
const PRIMARY = '#7c6dfa'
const ACCENT = '#c9993a'

export default function DagPlanner({ compact, embedded }: Props) {
  const [graph, setGraph] = useState<DagGraph>(() => sampleGraph())
  const [mode, setMode] = useState<Mode>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal')
  const [showGrid, setShowGrid] = useState(true)
  const [cycleWarn, setCycleWarn] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const drag = useRef<{ id: string; ox: number; oy: number; nx: number; ny: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const nodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes])

  const related = useMemo(() => {
    if (!selected) return { up: new Set<string>(), down: new Set<string>() }
    return {
      up: ancestors(graph, selected),
      down: descendants(graph, selected),
    }
  }, [graph, selected])

  const topo = useMemo(() => topologicalOrder(graph), [graph])

  const bounds = useMemo(() => graphBounds(graph, NODE_W, NODE_H), [graph])
  const pad = 48
  const vbW = Math.max(480, bounds.maxX - bounds.minX + pad * 2)
  const vbH = Math.max(360, bounds.maxY - bounds.minY + pad * 2)
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${vbW} ${vbH}`

  const selectedNode = selected ? nodeMap.get(selected) : null

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const sp = pt.matrixTransform(ctm.inverse())
    return { x: sp.x, y: sp.y }
  }, [])

  function addNodeAt(x: number, y: number) {
    const id = createId('n')
    const node: DagNode = {
      id,
      label: `Node ${graph.nodes.length + 1}`,
      x,
      y,
      status: 'todo',
    }
    setGraph((g) => ({ ...g, nodes: [...g.nodes, node] }))
    setSelected(id)
    setMode('select')
  }

  function tryConnect(from: string, to: string) {
    if (from === to) {
      setConnectFrom(null)
      return
    }
    if (graph.edges.some((e) => e.from === from && e.to === to)) {
      setConnectFrom(null)
      setCycleWarn('Edge already exists')
      window.setTimeout(() => setCycleWarn(null), 2000)
      return
    }
    if (wouldCreateCycle(graph, from, to)) {
      setCycleWarn('Blocked — that edge would create a cycle')
      setConnectFrom(null)
      window.setTimeout(() => setCycleWarn(null), 2400)
      return
    }
    setGraph((g) => ({
      ...g,
      edges: [...g.edges, { id: createId('e'), from, to }],
    }))
    setConnectFrom(null)
    setCycleWarn(null)
  }

  function onNodeClick(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (mode === 'delete') {
      removeNode(id)
      return
    }
    if (mode === 'connect') {
      if (!connectFrom) {
        setConnectFrom(id)
        setSelected(id)
      } else {
        tryConnect(connectFrom, id)
        setSelected(id)
      }
      return
    }
    setSelected(id)
  }

  function removeNode(id: string) {
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    }))
    if (selected === id) setSelected(null)
    if (connectFrom === id) setConnectFrom(null)
  }

  function removeEdge(id: string) {
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }))
  }

  function updateSelected(patch: Partial<DagNode>) {
    if (!selected) return
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === selected ? { ...n, ...patch } : n)),
    }))
  }

  function autoLayout() {
    setGraph((g) => layoutGraph(g, { direction }))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setConnectFrom(null)
        setMode('select')
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        setGraph((g) => ({
          nodes: g.nodes.filter((n) => n.id !== selected),
          edges: g.edges.filter((ed) => ed.from !== selected && ed.to !== selected),
        }))
        setSelected(null)
        setConnectFrom(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const svgDoc = useMemo(() => buildExportSvg(graph, direction, showGrid, viewBox, vbW, vbH), [
    graph,
    direction,
    showGrid,
    viewBox,
    vbW,
    vbH,
  ])

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svgDoc)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  function onImportFile(file: File) {
    file.text().then((text) => {
      const parsed = parseGraph(text)
      if (parsed) {
        setGraph(parsed)
        setSelected(null)
      } else {
        setCycleWarn('Invalid DAG JSON')
        window.setTimeout(() => setCycleWarn(null), 2000)
      }
    })
  }

  const padCls = compact ? 'px-4 py-4' : 'px-6 md:px-12 py-10'
  const maxW = compact ? 'max-w-none' : 'max-w-6xl mx-auto'

  return (
    <div className={`${padCls} ${maxW} pb-16`} style={{ color: 'var(--foreground)' }}>
      {!embedded && (
        <div className="mb-6">
          <Link
            to="/site/tools"
            className="font-mono-data text-xs tracking-widest uppercase"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ← Tools
          </Link>
        </div>
      )}

      <header className={compact ? 'mb-5' : 'mb-10'} style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-mono-data text-xs tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
          — PLANNING
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
          <div>
            <h1 className={`font-display ${compact ? 'text-2xl' : 'text-4xl md:text-5xl'} mb-2`}>
              DAG Planner
            </h1>
            <p className="text-sm max-w-xl" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
              Directed acyclic graphs for dependencies, knowledge maps, and system plans. Cycles are blocked at the
              edge.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="dag-btn dag-btn-ghost" onClick={copySvg}>
              {copied ? 'Copied' : 'Copy SVG'}
            </button>
            <button
              type="button"
              className="dag-btn dag-btn-ghost"
              onClick={() => downloadText('openclaw-dag.json', serializeGraph(graph), 'application/json')}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="dag-btn dag-btn-primary"
              onClick={() => downloadText('openclaw-dag.svg', svgDoc, 'image/svg+xml')}
            >
              Export SVG ↓
            </button>
          </div>
        </div>
      </header>

      <div className={`grid gap-6 ${compact ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        <aside className="space-y-5">
          <Block title="Mode">
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['select', 'Select'],
                  ['add', 'Add'],
                  ['connect', 'Link'],
                  ['delete', 'Delete'],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  active={mode === id}
                  onClick={() => {
                    setMode(id)
                    setConnectFrom(null)
                  }}
                >
                  {label}
                </Chip>
              ))}
            </div>
            {mode === 'connect' && (
              <p className="font-mono-data text-[10px] mt-2" style={{ color: 'var(--accent)' }}>
                {connectFrom ? 'Click target node…' : 'Click source node…'}
              </p>
            )}
            {mode === 'add' && (
              <p className="font-mono-data text-[10px] mt-2" style={{ color: 'var(--muted-foreground)' }}>
                Click canvas to place
              </p>
            )}
          </Block>

          <Block title="Layout">
            <div className="flex gap-1.5 mb-2">
              <Chip active={direction === 'horizontal'} onClick={() => setDirection('horizontal')}>
                LR
              </Chip>
              <Chip active={direction === 'vertical'} onClick={() => setDirection('vertical')}>
                TB
              </Chip>
            </div>
            <button type="button" className="dag-btn dag-btn-ghost w-full" onClick={autoLayout}>
              Auto-layout
            </button>
            <div className="mt-3">
              <Toggle label="Grid" checked={showGrid} onChange={setShowGrid} />
            </div>
          </Block>

          {selectedNode && (
            <Block title="Node">
              <label className="block mb-3">
                <span className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                  Label
                </span>
                <input
                  value={selectedNode.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-sm text-sm"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(['todo', 'doing', 'done'] as const).map((s) => (
                  <Chip
                    key={s}
                    active={selectedNode.status === s}
                    onClick={() => updateSelected({ status: s })}
                  >
                    {s}
                  </Chip>
                ))}
              </div>
              <p className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                ↑ {related.up.size} ancestors · ↓ {related.down.size} dependents
              </p>
              <button
                type="button"
                className="dag-btn dag-btn-ghost w-full mt-2"
                onClick={() => removeNode(selectedNode.id)}
              >
                Remove node
              </button>
            </Block>
          )}

          <Block title="Graph">
            <dl className="font-mono-data text-xs space-y-1.5" style={{ color: 'var(--secondary-foreground)' }}>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--muted-foreground)' }}>nodes</dt>
                <dd>{graph.nodes.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--muted-foreground)' }}>edges</dt>
                <dd>{graph.edges.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--muted-foreground)' }}>acyclic</dt>
                <dd style={{ color: topo ? '#4ade80' : '#f87171' }}>{topo ? 'yes' : 'no'}</dd>
              </div>
            </dl>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="dag-btn dag-btn-ghost flex-1"
                onClick={() => {
                  setGraph(sampleGraph())
                  setSelected(null)
                }}
              >
                Sample
              </button>
              <button
                type="button"
                className="dag-btn dag-btn-ghost flex-1"
                onClick={() => {
                  setGraph(emptyGraph())
                  setSelected(null)
                }}
              >
                Clear
              </button>
            </div>
            <button
              type="button"
              className="dag-btn dag-btn-ghost w-full mt-2"
              onClick={() => fileRef.current?.click()}
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImportFile(f)
                e.target.value = ''
              }}
            />
          </Block>

          {graph.edges.length > 0 && selected && (
            <Block title="Edges from selection">
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {graph.edges
                  .filter((e) => e.from === selected || e.to === selected)
                  .map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span className="font-mono-data text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>
                        {nodeMap.get(e.from)?.label} → {nodeMap.get(e.to)?.label}
                      </span>
                      <button
                        type="button"
                        className="font-mono-data text-[10px]"
                        style={{ color: 'var(--accent)' }}
                        onClick={() => removeEdge(e.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
              </ul>
            </Block>
          )}
        </aside>

        <section
          className="relative rounded-sm overflow-hidden"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            minHeight: compact ? 420 : 560,
            boxShadow: 'inset 0 0 80px rgba(124,109,250,0.05)',
          }}
        >
          {cycleWarn && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-sm font-mono-data text-xs"
              style={{
                backgroundColor: 'rgba(240,180,41,0.15)',
                border: '1px solid rgba(240,180,41,0.4)',
                color: ACCENT,
              }}
            >
              {cycleWarn}
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full touch-none"
            style={{ minHeight: compact ? 420 : 560, cursor: mode === 'add' ? 'crosshair' : 'default' }}
            onPointerDown={(e) => {
              if (mode !== 'add') return
              if ((e.target as Element).closest('[data-node]')) return
              const p = clientToSvg(e.clientX, e.clientY)
              addNodeAt(p.x, p.y)
            }}
            onPointerMove={(e) => {
              if (!drag.current) return
              const p = clientToSvg(e.clientX, e.clientY)
              const { id, ox, oy, nx, ny } = drag.current
              const x = nx + (p.x - ox)
              const y = ny + (p.y - oy)
              setGraph((g) => ({
                ...g,
                nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
              }))
            }}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerLeave={() => {
              drag.current = null
            }}
          >
            <defs>
              <marker
                id="dag-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={PRIMARY} />
              </marker>
              <marker
                id="dag-arrow-accent"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT} />
              </marker>
            </defs>

            {showGrid && (
              <g opacity={0.12}>
                {Array.from({ length: 24 }, (_, i) => (
                  <line
                    key={`v${i}`}
                    x1={bounds.minX - pad + i * 40}
                    y1={bounds.minY - pad}
                    x2={bounds.minX - pad + i * 40}
                    y2={bounds.minY - pad + vbH}
                    stroke={PRIMARY}
                    strokeWidth={0.5}
                  />
                ))}
                {Array.from({ length: 18 }, (_, i) => (
                  <line
                    key={`h${i}`}
                    x1={bounds.minX - pad}
                    y1={bounds.minY - pad + i * 40}
                    x2={bounds.minX - pad + vbW}
                    y2={bounds.minY - pad + i * 40}
                    stroke={PRIMARY}
                    strokeWidth={0.5}
                  />
                ))}
              </g>
            )}

            {graph.edges.map((e) => {
              const a = nodeMap.get(e.from)
              const b = nodeMap.get(e.to)
              if (!a || !b) return null
              const hot =
                selected &&
                (e.from === selected ||
                  e.to === selected ||
                  (related.up.has(e.from) && related.up.has(e.to)) ||
                  (related.down.has(e.from) && related.down.has(e.to)) ||
                  (related.up.has(e.from) && e.to === selected) ||
                  (e.from === selected && related.down.has(e.to)))
              return (
                <path
                  key={e.id}
                  d={edgePath(a, b, NODE_W, NODE_H, direction)}
                  fill="none"
                  stroke={hot ? ACCENT : PRIMARY}
                  strokeWidth={hot ? 1.8 : 1.2}
                  opacity={selected && !hot ? 0.25 : 0.85}
                  markerEnd={hot ? 'url(#dag-arrow-accent)' : 'url(#dag-arrow)'}
                />
              )
            })}

            {graph.nodes.map((n) => {
              const isSel = selected === n.id
              const isFrom = connectFrom === n.id
              const inUp = related.up.has(n.id)
              const inDown = related.down.has(n.id)
              const dim = selected && !isSel && !inUp && !inDown
              const status = n.status ?? 'todo'
              return (
                <g
                  key={n.id}
                  data-node
                  transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}
                  opacity={dim ? 0.35 : 1}
                  style={{ cursor: mode === 'select' ? 'grab' : 'pointer' }}
                  onPointerDown={(e) => {
                    if (mode !== 'select') return
                    e.stopPropagation()
                    const p = clientToSvg(e.clientX, e.clientY)
                    drag.current = { id: n.id, ox: p.x, oy: p.y, nx: n.x, ny: n.y }
                    setSelected(n.id)
                    ;(e.target as Element).setPointerCapture?.(e.pointerId)
                  }}
                  onClick={(e) => onNodeClick(n.id, e)}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={2}
                    fill="#0d0d1e"
                    stroke={isFrom || isSel ? ACCENT : PRIMARY}
                    strokeWidth={isSel || isFrom ? 1.8 : 1}
                    style={{
                      filter: isSel ? 'drop-shadow(0 0 8px rgba(201,153,58,0.35))' : undefined,
                    }}
                  />
                  <circle cx={10} cy={NODE_H / 2} r={3.5} fill={STATUS_COLOR[status]} />
                  <text
                    x={NODE_W / 2 + 4}
                    y={NODE_H / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--foreground)"
                    fontSize={11}
                    fontFamily="Outfit, system-ui, sans-serif"
                    className="pointer-events-none select-none"
                  >
                    {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between pointer-events-none">
            <span className="font-mono-data text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              {mode} · {graph.nodes.length}n / {graph.edges.length}e
            </span>
            <span className="font-mono-data text-[10px] tracking-widest" style={{ color: 'var(--accent)' }}>
              Del removes · Esc cancels link
            </span>
          </div>
        </section>
      </div>

      <style>{`
        .dag-btn {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.55rem 0.9rem;
          border-radius: 2px;
          transition: opacity 0.15s, box-shadow 0.2s;
        }
        .dag-btn:hover { opacity: 0.92; }
        .dag-btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border: 1px solid var(--primary);
          box-shadow: 0 0 18px rgba(124,109,250,0.25);
        }
        .dag-btn-ghost {
          background: transparent;
          color: var(--secondary-foreground);
          border: 1px solid var(--border);
        }
      `}</style>
    </div>
  )
}

function buildExportSvg(
  graph: DagGraph,
  direction: 'horizontal' | 'vertical',
  showGrid: boolean,
  viewBox: string,
  vbW: number,
  vbH: number,
): string {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const bounds = graphBounds(graph, NODE_W, NODE_H)
  const pad = 48
  const ox = bounds.minX - pad
  const oy = bounds.minY - pad

  const edges = graph.edges
    .map((e) => {
      const a = nodeMap.get(e.from)
      const b = nodeMap.get(e.to)
      if (!a || !b) return ''
      return `<path d="${edgePath(a, b, NODE_W, NODE_H, direction)}" fill="none" stroke="${PRIMARY}" stroke-width="1.2" marker-end="url(#arrow)"/>`
    })
    .join('\n')

  const nodes = graph.nodes
    .map((n) => {
      const status = n.status ?? 'todo'
      const x = n.x - NODE_W / 2
      const y = n.y - NODE_H / 2
      const label = n.label.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      return `<g transform="translate(${x},${y})">
  <rect width="${NODE_W}" height="${NODE_H}" rx="2" fill="#0d0d1e" stroke="${PRIMARY}" stroke-width="1"/>
  <circle cx="10" cy="${NODE_H / 2}" r="3.5" fill="${STATUS_COLOR[status]}"/>
  <text x="${NODE_W / 2 + 4}" y="${NODE_H / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="#e8e4f0" font-size="11" font-family="sans-serif">${label}</text>
</g>`
    })
    .join('\n')

  void showGrid
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${viewBox}" role="img" aria-label="DAG">
  <title>DAG Planner</title>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${PRIMARY}"/>
    </marker>
  </defs>
  <rect x="${ox}" y="${oy}" width="${vbW}" height="${vbH}" fill="${BG}"/>
  <g id="edges" inkscape:groupmode="layer" inkscape:label="Edges" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">${edges}</g>
  <g id="nodes" inkscape:groupmode="layer" inkscape:label="Nodes" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">${nodes}</g>
</svg>
`
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono-data text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono-data text-[10px] tracking-wider uppercase px-2 py-1.5 rounded-sm transition-all"
      style={{
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        backgroundColor: active ? 'rgba(124,109,250,0.14)' : 'var(--card)',
        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
      }}
    >
      {children}
    </button>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--primary)]"
      />
      <span className="font-mono-data text-xs" style={{ color: 'var(--secondary-foreground)' }}>
        {label}
      </span>
    </label>
  )
}
