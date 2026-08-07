import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  PHI,
  buildFibSquares,
  normalizeSquares,
  fibSpiralPath,
  fibonacci,
  goldenLogSpiral,
  polylinePath,
  boundsOfSquares,
  boundsOfPoints,
  mergeBounds,
  spiralOrigin,
  downloadSvg,
  fmt,
} from '@/lib/fibonacciSpiral'

type Props = {
  compact?: boolean
  embedded?: boolean
}

type SpiralMode = 'fibonacci' | 'golden' | 'both'

const BG = '#06060f'
const PRIMARY = '#7c6dfa'
const ACCENT = '#c9993a'

export default function FibonacciSpiralGenerator({ compact, embedded }: Props) {
  const [terms, setTerms] = useState(9)
  const [mode, setMode] = useState<SpiralMode>('both')
  const [showSquares, setShowSquares] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showDiagonals, setShowDiagonals] = useState(false)
  const [showPhi, setShowPhi] = useState(true)
  const [strokeWidth, setStrokeWidth] = useState(1.4)
  const [logTurns, setLogTurns] = useState(3)
  const [resolution, setResolution] = useState(96)
  const [mirror, setMirror] = useState(false)
  const [copied, setCopied] = useState(false)

  const fib = useMemo(() => fibonacci(terms), [terms])

  const squares = useMemo(() => normalizeSquares(buildFibSquares(terms, 1), 420), [terms])

  const fibPath = useMemo(() => fibSpiralPath(squares), [squares])

  const origin = useMemo(() => spiralOrigin(squares), [squares])

  const squareBounds = useMemo(() => boundsOfSquares(squares), [squares])
  const mirrorMidX = (squareBounds.minX + squareBounds.maxX) / 2

  const logPts = useMemo(() => {
    if (mode === 'fibonacci') return []
    const dim = Math.max(squareBounds.maxX - squareBounds.minX, squareBounds.maxY - squareBounds.minY)
    const a = Math.max(dim * 0.008, 1.2)
    const pts = goldenLogSpiral(logTurns, a, resolution, true, origin)
    if (!mirror) return pts
    return pts.map((p) => ({ x: mirrorMidX * 2 - p.x, y: p.y }))
  }, [mode, squareBounds, logTurns, resolution, origin, mirror, mirrorMidX])

  const logPath = useMemo(() => polylinePath(logPts), [logPts])

  const bounds = useMemo(() => {
    let b = squareBounds
    if (logPts.length) b = mergeBounds(b, boundsOfPoints(logPts))
    return b
  }, [squareBounds, logPts])

  const pad = 24
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`

  const geoTransform = mirror ? `translate(${mirrorMidX * 2} 0) scale(-1 1)` : undefined

  const mx = (x: number) => (mirror ? mirrorMidX * 2 - x : x)

  const ratio = fib.length >= 2 ? fib[fib.length - 1] / fib[fib.length - 2] : 1

  const svgDoc = useMemo(() => {
    const w = bounds.maxX - bounds.minX + pad * 2
    const h = bounds.maxY - bounds.minY + pad * 2
    const ox = bounds.minX - pad
    const oy = bounds.minY - pad

    const squareEls = showSquares
      ? squares
          .map(
            (s) =>
              `<rect x="${fmt(s.x)}" y="${fmt(s.y)}" width="${fmt(s.size)}" height="${fmt(s.size)}" fill="none" stroke="${PRIMARY}" stroke-width="${strokeWidth * 0.75}" opacity="0.55"/>`,
          )
          .join('\n')
      : ''

    const labelEls = showLabels
      ? squares
          .map((s) => {
            const fs = Math.max(8, Math.min(18, s.size * 0.28))
            return `<text x="${fmt(mx(s.x + s.size / 2))}" y="${fmt(s.y + s.size / 2)}" text-anchor="middle" dominant-baseline="central" fill="${ACCENT}" font-family="JetBrains Mono, monospace" font-size="${fs}" opacity="0.85">${s.value}</text>`
          })
          .join('\n')
      : ''

    const diagEls = showDiagonals
      ? squares
          .map(
            (s) =>
              `<line x1="${fmt(s.x)}" y1="${fmt(s.y + s.size)}" x2="${fmt(s.x + s.size)}" y2="${fmt(s.y)}" stroke="${ACCENT}" stroke-width="${strokeWidth * 0.4}" opacity="0.25"/>`,
          )
          .join('\n')
      : ''

    const fibEl =
      (mode === 'fibonacci' || mode === 'both') && fibPath
        ? `<path d="${fibPath}" fill="none" stroke="${ACCENT}" stroke-width="${strokeWidth * 1.35}" stroke-linecap="round"/>`
        : ''

    const logEl =
      (mode === 'golden' || mode === 'both') && logPath
        ? `<path d="${logPath}" fill="none" stroke="${PRIMARY}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${mode === 'both' ? 0.7 : 1}"/>`
        : ''

    const gOpen = mirror
      ? `<g transform="translate(${fmt(mirrorMidX * 2)} 0) scale(-1 1)">`
      : '<g>'
    const gClose = '</g>'

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  width="${fmt(w)}" height="${fmt(h)}" viewBox="${fmt(ox)} ${fmt(oy)} ${fmt(w)} ${fmt(h)}" role="img" aria-label="Fibonacci spiral">
  <title>Fibonacci Spiral</title>
  <rect x="${fmt(ox)}" y="${fmt(oy)}" width="${fmt(w)}" height="${fmt(h)}" fill="${BG}"/>
  ${gOpen}
  <g id="squares" inkscape:groupmode="layer" inkscape:label="Squares">${squareEls}</g>
  <g id="diagonals" inkscape:groupmode="layer" inkscape:label="Diagonals">${diagEls}</g>
  <g id="fib-spiral" inkscape:groupmode="layer" inkscape:label="Fibonacci Spiral">${fibEl}</g>
  ${gClose}
  <g id="golden-spiral" inkscape:groupmode="layer" inkscape:label="Golden Spiral">${logEl}</g>
  <g id="labels" inkscape:groupmode="layer" inkscape:label="Labels">${labelEls}</g>
</svg>
`
  }, [
    bounds,
    pad,
    squares,
    showSquares,
    showLabels,
    showDiagonals,
    mode,
    fibPath,
    logPath,
    strokeWidth,
    mirror,
    mirrorMidX,
    mx,
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
          — SPIRAL
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
          <div>
            <h1 className={`font-display ${compact ? 'text-2xl' : 'text-4xl md:text-5xl'} mb-2`}>
              Fibonacci Spiral
            </h1>
            <p className="text-sm max-w-xl" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
              Precise Fibonacci rectangles, quarter-circle spiral, and the true golden logarithmic curve — exportable
              as layered SVG.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copySvg} className="fib-btn fib-btn-ghost">
              {copied ? 'Copied' : 'Copy SVG'}
            </button>
            <button
              type="button"
              onClick={() => downloadSvg('openclaw-fibonacci-spiral.svg', svgDoc)}
              className="fib-btn fib-btn-primary"
            >
              Export SVG ↓
            </button>
          </div>
        </div>
      </header>

      <div className={`grid gap-6 ${compact ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        <aside className="space-y-5">
          <Block title="Sequence">
            <Range label={`terms ${terms}`} min={3} max={14} value={terms} onChange={setTerms} />
            <p className="font-mono-data text-[10px] leading-relaxed mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {fib.join(', ')}
            </p>
            {showPhi && (
              <dl className="mt-3 font-mono-data text-xs space-y-1" style={{ color: 'var(--secondary-foreground)' }}>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--muted-foreground)' }}>φ</dt>
                  <dd>{PHI.toFixed(8)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--muted-foreground)' }}>Fₙ/Fₙ₋₁</dt>
                  <dd>{ratio.toFixed(8)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--muted-foreground)' }}>error</dt>
                  <dd style={{ color: Math.abs(ratio - PHI) < 0.01 ? '#4ade80' : ACCENT }}>
                    {(ratio - PHI >= 0 ? '+' : '') + (ratio - PHI).toExponential(2)}
                  </dd>
                </div>
              </dl>
            )}
          </Block>

          <Block title="Curve">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['fibonacci', 'Fib'],
                  ['golden', 'φ log'],
                  ['both', 'Both'],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={mode === id} onClick={() => setMode(id)}>
                  {label}
                </Chip>
              ))}
            </div>
            {(mode === 'golden' || mode === 'both') && (
              <div className="mt-3">
                <Range
                  label={`turns ${logTurns.toFixed(1)}`}
                  min={1}
                  max={5}
                  step={0.5}
                  value={logTurns}
                  onChange={setLogTurns}
                />
                <Range
                  label={`samples/turn ${resolution}`}
                  min={32}
                  max={192}
                  step={16}
                  value={resolution}
                  onChange={setResolution}
                />
              </div>
            )}
            <div className="mt-3">
              <Range
                label={`stroke ${strokeWidth.toFixed(1)}`}
                min={0.5}
                max={3}
                step={0.1}
                value={strokeWidth}
                onChange={setStrokeWidth}
              />
            </div>
          </Block>

          <Block title="Layers">
            <div className="space-y-2">
              <Toggle label="Fibonacci squares" checked={showSquares} onChange={setShowSquares} />
              <Toggle label="Number labels" checked={showLabels} onChange={setShowLabels} />
              <Toggle label="Square diagonals" checked={showDiagonals} onChange={setShowDiagonals} />
              <Toggle label="φ readout" checked={showPhi} onChange={setShowPhi} />
              <Toggle label="Mirror spiral" checked={mirror} onChange={setMirror} />
            </div>
          </Block>

          <p className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
            Gold = Fibonacci arcs · Violet = logarithmic φ
          </p>
        </aside>

        <section
          className="relative rounded-sm overflow-hidden flex items-center justify-center"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            minHeight: compact ? 420 : 560,
            boxShadow: 'inset 0 0 80px rgba(201,153,58,0.05)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background: 'radial-gradient(ellipse at 40% 55%, rgba(201,153,58,0.08) 0%, transparent 60%)',
            }}
          />
          <svg
            viewBox={viewBox}
            className="relative w-full h-full max-h-[70vh] p-4"
            style={{ maxWidth: 720 }}
            role="img"
            aria-label="Fibonacci and golden spiral"
          >
            <g transform={geoTransform}>
              {showSquares &&
                squares.map((s) => (
                  <rect
                    key={s.n}
                    x={s.x}
                    y={s.y}
                    width={s.size}
                    height={s.size}
                    fill="none"
                    stroke={PRIMARY}
                    strokeWidth={strokeWidth * 0.75}
                    opacity={0.55}
                  />
                ))}

              {showDiagonals &&
                squares.map((s) => (
                  <line
                    key={`d-${s.n}`}
                    x1={s.x}
                    y1={s.y + s.size}
                    x2={s.x + s.size}
                    y2={s.y}
                    stroke={ACCENT}
                    strokeWidth={strokeWidth * 0.4}
                    opacity={0.25}
                  />
                ))}

              {(mode === 'fibonacci' || mode === 'both') && fibPath && (
                <path
                  d={fibPath}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={strokeWidth * 1.35}
                  strokeLinecap="round"
                  className="fib-draw"
                />
              )}

              <circle cx={origin.x} cy={origin.y} r={3} fill={ACCENT} opacity={0.8} />
            </g>

            {(mode === 'golden' || mode === 'both') && logPath && (
              <path
                d={logPath}
                fill="none"
                stroke={PRIMARY}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={mode === 'both' ? 0.75 : 1}
              />
            )}

            {showLabels &&
              squares.map((s) => {
                const fs = Math.max(8, Math.min(18, s.size * 0.28))
                return (
                  <text
                    key={`t-${s.n}`}
                    x={mx(s.x + s.size / 2)}
                    y={s.y + s.size / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={ACCENT}
                    fontSize={fs}
                    fontFamily="JetBrains Mono, ui-monospace, monospace"
                    opacity={0.85}
                  >
                    {s.value}
                  </text>
                )
              })}
          </svg>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between pointer-events-none">
            <span className="font-mono-data text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              {terms} terms · F{terms}={fib[fib.length - 1]}
            </span>
            <span className="font-mono-data text-[10px] tracking-widest" style={{ color: 'var(--accent)' }}>
              φ ≈ {PHI.toFixed(5)}
            </span>
          </div>
        </section>
      </div>

      <style>{`
        .fib-btn {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.55rem 1rem;
          border-radius: 2px;
          transition: opacity 0.15s, box-shadow 0.2s;
        }
        .fib-btn:hover { opacity: 0.92; }
        .fib-btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border: 1px solid var(--primary);
          box-shadow: 0 0 18px rgba(124,109,250,0.25);
        }
        .fib-btn-ghost {
          background: transparent;
          color: var(--secondary-foreground);
          border: 1px solid var(--border);
        }
        .fib-draw {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: fib-reveal 2.4s ease forwards;
        }
        @keyframes fib-reveal {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fib-draw { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; }
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
