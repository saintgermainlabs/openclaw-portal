import { useMemo, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router'
import {
  type Hex,
  type HexOrientation,
  type LatticeShape,
  type CellData,
  generateLattice,
  hexKey,
  hexToPixel,
  hexCorners,
  polygonPoints,
  latticeEdges,
  distanceField,
  heatColor,
  boundsOf,
  downloadSvg,
  hexNeighbors,
} from '@/lib/hexLattice'

type Props = {
  compact?: boolean
  embedded?: boolean
}

type PaintMode = 'select' | 'paint' | 'erase' | 'origin'
type ColorMode = 'solid' | 'heat' | 'distance'

const BG = '#06060f'
const STROKE = '#7c6dfa'
const ACCENT = '#c9993a'

export default function HexLatticeExplorer({ compact, embedded }: Props) {
  const [shape, setShape] = useState<LatticeShape>('hexagon')
  const [orientation, setOrientation] = useState<HexOrientation>('pointy')
  const [radius, setRadius] = useState(4)
  const [cols, setCols] = useState(8)
  const [rows, setRows] = useState(7)
  const [size, setSize] = useState(22)
  const [strokeWidth, setStrokeWidth] = useState(1)
  const [mode, setMode] = useState<PaintMode>('select')
  const [colorMode, setColorMode] = useState<ColorMode>('heat')
  const [showEdges, setShowEdges] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [showCoords, setShowCoords] = useState(false)
  const [paintValue, setPaintValue] = useState(0.7)
  const [selected, setSelected] = useState<string | null>(null)
  const [origins, setOrigins] = useState<string[]>(['0,0'])
  const [cellData, setCellData] = useState<Record<string, CellData>>({})
  const [hover, setHover] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const painting = useRef(false)

  const cells = useMemo(
    () => generateLattice(shape, radius, cols, rows, orientation),
    [shape, radius, cols, rows, orientation],
  )

  const cellSet = useMemo(() => new Set(cells.map(hexKey)), [cells])

  const edges = useMemo(() => (showEdges ? latticeEdges(cells) : []), [cells, showEdges])

  const originHexes = useMemo(
    () => origins.map((k) => {
      const [q, r] = k.split(',').map(Number)
      return { q, r } as Hex
    }).filter((h) => cellSet.has(hexKey(h))),
    [origins, cellSet],
  )

  const distances = useMemo(
    () => (colorMode === 'distance' ? distanceField(cells, originHexes.length ? originHexes : [{ q: 0, r: 0 }]) : null),
    [cells, originHexes, colorMode],
  )

  const maxDist = useMemo(() => {
    if (!distances) return 1
    let m = 1
    for (const d of distances.values()) m = Math.max(m, d)
    return m
  }, [distances])

  const bounds = useMemo(() => boundsOf(cells, size, orientation), [cells, size, orientation])
  const pad = size * 0.6
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`

  const selectedHex = selected
    ? (() => {
        const [q, r] = selected.split(',').map(Number)
        return { q, r } as Hex
      })()
    : null

  const neighborKeys = useMemo(() => {
    if (!selectedHex) return new Set<string>()
    return new Set(hexNeighbors(selectedHex).map(hexKey).filter((k) => cellSet.has(k)))
  }, [selectedHex, cellSet])

  const applyPaint = useCallback(
    (key: string) => {
      if (mode === 'select') {
        setSelected(key)
        return
      }
      if (mode === 'origin') {
        setOrigins((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
        setSelected(key)
        return
      }
      if (mode === 'erase') {
        setCellData((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
        return
      }
      setCellData((prev) => ({
        ...prev,
        [key]: { value: paintValue, label: prev[key]?.label },
      }))
    },
    [mode, paintValue],
  )

  function fillRandom() {
    const next: Record<string, CellData> = {}
    for (const c of cells) {
      next[hexKey(c)] = { value: Math.random() }
    }
    setCellData(next)
    setColorMode('heat')
  }

  function clearData() {
    setCellData({})
  }

  function cellFill(h: Hex): string {
    const k = hexKey(h)
    if (colorMode === 'distance' && distances) {
      const d = distances.get(k)
      if (d === undefined) return 'rgba(20,18,40,0.6)'
      return heatColor(d / maxDist, '#12122a', ACCENT)
    }
    if (colorMode === 'heat') {
      const v = cellData[k]?.value
      if (v === undefined) return 'rgba(13,13,30,0.85)'
      return heatColor(v, '#1a1433', STROKE)
    }
    if (origins.includes(k)) return 'rgba(201,153,58,0.35)'
    if (selected === k) return 'rgba(124,109,250,0.28)'
    if (neighborKeys.has(k)) return 'rgba(124,109,250,0.12)'
    return 'rgba(13,13,30,0.85)'
  }

  function cellStroke(h: Hex): string {
    const k = hexKey(h)
    if (origins.includes(k)) return ACCENT
    if (selected === k) return '#a89bff'
    if (hover === k) return ACCENT
    return STROKE
  }

  const svgDoc = useMemo(() => {
    const w = bounds.maxX - bounds.minX + pad * 2
    const h = bounds.maxY - bounds.minY + pad * 2
    const ox = bounds.minX - pad
    const oy = bounds.minY - pad

    const edgeLines = edges
      .map(([a, b]) => {
        const pa = hexToPixel(a, size, orientation)
        const pb = hexToPixel(b, size, orientation)
        return `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${STROKE}" stroke-width="${strokeWidth * 0.6}" opacity="0.35"/>`
      })
      .join('\n')

    const polys = cells
      .map((c) => {
        const p = hexToPixel(c, size, orientation)
        const pts = polygonPoints(hexCorners(p, size * 0.95, orientation))
        const fill = cellFill(c)
        return `<polygon points="${pts}" fill="${fill}" stroke="${STROKE}" stroke-width="${strokeWidth}"/>`
      })
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${ox} ${oy} ${w} ${h}" role="img" aria-label="Hex lattice">
  <title>Hex Lattice Explorer</title>
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="${BG}"/>
  <g id="edges" inkscape:groupmode="layer" inkscape:label="Edges" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">
${edgeLines}
  </g>
  <g id="cells" inkscape:groupmode="layer" inkscape:label="Cells" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">
${polys}
  </g>
</svg>
`
    // cellFill closes over state — intentional for export snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, edges, size, orientation, bounds, pad, strokeWidth, cellData, colorMode, distances, maxDist, origins, selected, neighborKeys])

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svgDoc)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  const padCls = compact ? 'px-4 py-4' : 'px-6 md:px-12 py-10'
  const maxW = compact ? 'max-w-none' : 'max-w-6xl mx-auto'

  const selectedInfo = selectedHex
    ? {
        key: selected!,
        neighbors: hexNeighbors(selectedHex).filter((n) => cellSet.has(hexKey(n))).length,
        value: cellData[selected!]?.value,
        dist: distances?.get(selected!),
      }
    : null

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
          — LATTICE
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
          <div>
            <h1 className={`font-display ${compact ? 'text-2xl' : 'text-4xl md:text-5xl'} mb-2`}>
              Hex Lattice Explorer
            </h1>
            <p className="text-sm max-w-xl" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
              Tessellate, paint values, and inspect neighbor topology. Built for hex grids and distributed-system
              diagrams.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copySvg} className="hex-btn hex-btn-ghost">
              {copied ? 'Copied' : 'Copy SVG'}
            </button>
            <button
              type="button"
              onClick={() => downloadSvg('openclaw-hex-lattice.svg', svgDoc)}
              className="hex-btn hex-btn-primary"
            >
              Export SVG ↓
            </button>
          </div>
        </div>
      </header>

      <div className={`grid gap-6 ${compact ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        <aside className="space-y-5">
          <Block title="Shape">
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['hexagon', 'Hexagon'],
                  ['rectangle', 'Rectangle'],
                  ['ring', 'Ring'],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={shape === id} onClick={() => setShape(id)}>
                  {label}
                </Chip>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <Chip active={orientation === 'pointy'} onClick={() => setOrientation('pointy')}>
                Pointy
              </Chip>
              <Chip active={orientation === 'flat'} onClick={() => setOrientation('flat')}>
                Flat
              </Chip>
            </div>
          </Block>

          <Block title="Size">
            {shape === 'rectangle' ? (
              <>
                <Range label={`cols ${cols}`} min={3} max={16} value={cols} onChange={setCols} />
                <Range label={`rows ${rows}`} min={3} max={14} value={rows} onChange={setRows} />
              </>
            ) : (
              <Range label={`radius ${radius}`} min={1} max={8} value={radius} onChange={setRadius} />
            )}
            <Range label={`cell ${size}`} min={12} max={36} value={size} onChange={setSize} />
            <Range
              label={`stroke ${strokeWidth.toFixed(1)}`}
              min={0.4}
              max={2.5}
              step={0.1}
              value={strokeWidth}
              onChange={setStrokeWidth}
            />
          </Block>

          <Block title="Interact">
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['select', 'Select'],
                  ['paint', 'Paint'],
                  ['erase', 'Erase'],
                  ['origin', 'Origin'],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={mode === id} onClick={() => setMode(id)}>
                  {label}
                </Chip>
              ))}
            </div>
            {mode === 'paint' && (
              <div className="mt-3">
                <Range
                  label={`value ${paintValue.toFixed(2)}`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={paintValue}
                  onChange={setPaintValue}
                />
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button type="button" className="hex-btn hex-btn-ghost flex-1" onClick={fillRandom}>
                Random
              </button>
              <button type="button" className="hex-btn hex-btn-ghost flex-1" onClick={clearData}>
                Clear
              </button>
            </div>
          </Block>

          <Block title="Color">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['solid', 'Solid'],
                  ['heat', 'Heat'],
                  ['distance', 'Dist'],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={colorMode === id} onClick={() => setColorMode(id)}>
                  {label}
                </Chip>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Toggle label="Topology edges" checked={showEdges} onChange={setShowEdges} />
              <Toggle label="Value labels" checked={showLabels} onChange={setShowLabels} />
              <Toggle label="Axial coords" checked={showCoords} onChange={setShowCoords} />
            </div>
          </Block>

          {selectedInfo && (
            <Block title="Cell">
              <dl className="font-mono-data text-xs space-y-1.5" style={{ color: 'var(--secondary-foreground)' }}>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--muted-foreground)' }}>axial</dt>
                  <dd>({selectedInfo.key})</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--muted-foreground)' }}>neighbors</dt>
                  <dd>{selectedInfo.neighbors}</dd>
                </div>
                {selectedInfo.value !== undefined && (
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--muted-foreground)' }}>value</dt>
                    <dd>{selectedInfo.value.toFixed(2)}</dd>
                  </div>
                )}
                {selectedInfo.dist !== undefined && (
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--muted-foreground)' }}>distance</dt>
                    <dd>{selectedInfo.dist}</dd>
                  </div>
                )}
              </dl>
            </Block>
          )}

          <p className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
            {cells.length} cells · {edges.length} edges
          </p>
        </aside>

        <section
          className="relative rounded-sm overflow-hidden flex items-center justify-center"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            minHeight: compact ? 420 : 560,
            boxShadow: 'inset 0 0 80px rgba(124,109,250,0.06)',
          }}
          onPointerLeave={() => {
            painting.current = false
            setHover(null)
          }}
          onPointerUp={() => {
            painting.current = false
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(124,109,250,0.1) 0%, transparent 65%)',
            }}
          />
          <svg
            viewBox={viewBox}
            className="relative w-full h-full max-h-[70vh] p-4 touch-none"
            style={{ maxWidth: 720 }}
            role="img"
            aria-label="Hexagonal lattice"
          >
            {showEdges &&
              edges.map(([a, b]) => {
                const pa = hexToPixel(a, size, orientation)
                const pb = hexToPixel(b, size, orientation)
                return (
                  <line
                    key={`${hexKey(a)}-${hexKey(b)}`}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke={STROKE}
                    strokeWidth={strokeWidth * 0.55}
                    opacity={0.28}
                  />
                )
              })}

            {cells.map((c) => {
              const k = hexKey(c)
              const p = hexToPixel(c, size, orientation)
              const pts = polygonPoints(hexCorners(p, size * 0.95, orientation))
              const isOrigin = origins.includes(k)
              return (
                <g key={k}>
                  <polygon
                    points={pts}
                    fill={cellFill(c)}
                    stroke={cellStroke(c)}
                    strokeWidth={isOrigin || selected === k ? strokeWidth * 1.4 : strokeWidth}
                    className="cursor-pointer"
                    style={{ transition: 'fill 120ms ease' }}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      painting.current = true
                      applyPaint(k)
                    }}
                    onPointerEnter={() => {
                      setHover(k)
                      if (painting.current && (mode === 'paint' || mode === 'erase')) applyPaint(k)
                    }}
                  />
                  {(showCoords || showLabels) && (
                    <text
                      x={p.x}
                      y={p.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={ACCENT}
                      fontSize={Math.max(7, size * 0.28)}
                      fontFamily="JetBrains Mono, ui-monospace, monospace"
                      opacity={0.85}
                      className="pointer-events-none select-none"
                    >
                      {showLabels && cellData[k]?.value !== undefined
                        ? cellData[k].value.toFixed(1)
                        : showCoords
                          ? `${c.q},${c.r}`
                          : ''}
                    </text>
                  )}
                  {isOrigin && (
                    <circle cx={p.x} cy={p.y} r={size * 0.12} fill={ACCENT} className="pointer-events-none" />
                  )}
                </g>
              )
            })}
          </svg>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between pointer-events-none">
            <span className="font-mono-data text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              {orientation} · {shape}
              {hover ? ` · ${hover}` : ''}
            </span>
            <span className="font-mono-data text-[10px] tracking-widest" style={{ color: 'var(--accent)' }}>
              drag to paint
            </span>
          </div>
        </section>
      </div>

      <style>{`
        .hex-btn {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.55rem 1rem;
          border-radius: 2px;
          transition: opacity 0.15s, box-shadow 0.2s;
        }
        .hex-btn:hover { opacity: 0.92; }
        .hex-btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border: 1px solid var(--primary);
          box-shadow: 0 0 18px rgba(124,109,250,0.25);
        }
        .hex-btn-ghost {
          background: transparent;
          color: var(--secondary-foreground);
          border: 1px solid var(--border);
        }
      `}</style>
    </div>
  )
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

function Range({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="mb-2">
      <div className="font-mono-data text-[10px] mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
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
