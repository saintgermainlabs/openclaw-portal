import { useMemo, useState, useEffect, startTransition } from 'react'
import { Link } from 'react-router'
import {
  PATTERNS,
  buildGeometry,
  layersToSvg,
  downloadSvg,
  type PatternId,
} from '@/lib/sacredGeometry'

type Props = {
  /** Tighter chrome when embedded in the portal result pane */
  compact?: boolean
  /** Hide back-link when opened as a portal app */
  embedded?: boolean
}

const PRESETS = {
  stroke: '#7c6dfa',
  accent: '#c9993a',
  bg: '#06060f',
}

export default function SacredGeometryBuilder({ compact, embedded }: Props) {
  const [pattern, setPattern] = useState<PatternId>('flower')
  const [rings, setRings] = useState(2)
  const [radius, setRadius] = useState(42)
  const [strokeWidth, setStrokeWidth] = useState(1.1)
  const [stroke, setStroke] = useState(PRESETS.stroke)
  const [accent, setAccent] = useState(PRESETS.accent)
  const [showCenters, setShowCenters] = useState(false)
  const [showBounding, setShowBounding] = useState(true)
  const [exportBg, setExportBg] = useState(true)
  const [rotate, setRotate] = useState(true)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const meta = PATTERNS.find((p) => p.id === pattern)!

  const built = useMemo(
    () =>
      buildGeometry({
        pattern,
        radius,
        rings,
        stroke,
        accent,
        strokeWidth,
        showCenters,
        showBounding,
      }),
    [pattern, radius, rings, stroke, accent, strokeWidth, showCenters, showBounding],
  )

  // Reset visible layers when pattern structure changes
  const layerKey = `${pattern}:${rings}:${showCenters}:${showBounding}`
  useEffect(() => {
    startTransition(() => {
      setVisible(new Set(built.layers.map((l) => l.id)))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when structure changes
  }, [layerKey])

  const svgDoc = useMemo(
    () =>
      layersToSvg(built.layers, visible, built.extent, {
        background: exportBg ? PRESETS.bg : undefined,
        title: meta.name,
      }),
    [built, visible, exportBg, meta.name],
  )

  // Live preview: strip XML declaration for inline SVG
  const previewInner = useMemo(() => {
    const groups = built.layers
      .filter((l) => visible.has(l.id))
      .map((l) => `<g id="${l.id}">${l.markup}</g>`)
      .join('')
    return groups
  }, [built, visible])

  const extent = built.extent * 1.08
  const vb = `${-extent} ${-extent} ${extent * 2} ${extent * 2}`

  function toggleLayer(id: string) {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svgDoc)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  function exportFile() {
    downloadSvg(`openclaw-${pattern}.svg`, svgDoc)
  }

  const pad = compact ? 'px-4 py-4' : 'px-6 md:px-12 py-10'
  const maxW = compact ? 'max-w-none' : 'max-w-6xl mx-auto'

  return (
    <div className={`${pad} ${maxW} pb-16`} style={{ color: 'var(--foreground)' }}>
      {!embedded && (
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/site/tools"
            className="font-mono-data text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ← Tools
          </Link>
        </div>
      )}

      <header className={compact ? 'mb-5' : 'mb-10'} style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-mono-data text-xs tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
          — GEOMETRY
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
          <div>
            <h1 className={`font-display ${compact ? 'text-2xl' : 'text-4xl md:text-5xl'} mb-2`}>
              Sacred Geometry Builder
            </h1>
            <p className="text-sm max-w-xl" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
              Compose classical forms as layered SVG. Toggle construction layers, tune stroke, export for Inkscape or
              code.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copySvg} className="geo-btn geo-btn-ghost">
              {copied ? 'Copied' : 'Copy SVG'}
            </button>
            <button type="button" onClick={exportFile} className="geo-btn geo-btn-primary">
              Export SVG ↓
            </button>
          </div>
        </div>
      </header>

      <div className={`grid gap-6 ${compact ? 'lg:grid-cols-[240px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        {/* Controls */}
        <aside className="space-y-6">
          <ControlBlock title="Pattern">
            <div className="grid grid-cols-1 gap-1.5">
              {PATTERNS.map((p) => {
                const active = p.id === pattern
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPattern(p.id)
                      if (p.defaultRings) setRings(p.defaultRings)
                    }}
                    className="text-left px-3 py-2 rounded-sm transition-all"
                    style={{
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: active ? 'rgba(124,109,250,0.12)' : 'var(--card)',
                      boxShadow: active ? '0 0 16px rgba(124,109,250,0.15)' : 'none',
                    }}
                  >
                    <span className="font-display text-sm block" style={{ color: active ? 'var(--foreground)' : 'var(--secondary-foreground)' }}>
                      {p.name}
                    </span>
                    <span className="text-[11px] leading-snug block mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {p.blurb}
                    </span>
                  </button>
                )
              })}
            </div>
          </ControlBlock>

          {meta.rings && (
            <ControlBlock title="Rings">
              <RangeRow
                label={`${rings}`}
                min={1}
                max={meta.maxRings ?? 5}
                step={1}
                value={rings}
                onChange={setRings}
              />
            </ControlBlock>
          )}

          <ControlBlock title="Stroke">
            <RangeRow label={`r ${radius}`} min={20} max={80} step={1} value={radius} onChange={setRadius} />
            <RangeRow
              label={`w ${strokeWidth.toFixed(1)}`}
              min={0.4}
              max={3}
              step={0.1}
              value={strokeWidth}
              onChange={setStrokeWidth}
            />
            <div className="flex gap-3 mt-3">
              <ColorField label="Line" value={stroke} onChange={setStroke} />
              <ColorField label="Accent" value={accent} onChange={setAccent} />
            </div>
          </ControlBlock>

          <ControlBlock title="Layers">
            <div className="space-y-2">
              {built.layers.map((layer) => (
                <label key={layer.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={visible.has(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="font-mono-data text-xs tracking-wide" style={{ color: 'var(--secondary-foreground)' }}>
                    {layer.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 space-y-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <ToggleRow label="Show centers" checked={showCenters} onChange={setShowCenters} />
              <ToggleRow label="Field circle" checked={showBounding} onChange={setShowBounding} />
              <ToggleRow label="Export background" checked={exportBg} onChange={setExportBg} />
              <ToggleRow label="Slow rotation" checked={rotate} onChange={setRotate} />
            </div>
          </ControlBlock>
        </aside>

        {/* Canvas */}
        <section
          className="relative rounded-sm overflow-hidden flex items-center justify-center sacred-bg"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            minHeight: compact ? 420 : 560,
            boxShadow: 'inset 0 0 80px rgba(124,109,250,0.06)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(124,109,250,0.12) 0%, transparent 65%)',
            }}
          />
          <svg
            viewBox={vb}
            className={`relative w-full h-full max-h-[70vh] p-6 ${rotate ? 'geo-spin' : ''}`}
            style={{ maxWidth: 640 }}
            role="img"
            aria-label={meta.name}
            dangerouslySetInnerHTML={{ __html: previewInner }}
          />
          <div
            className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none"
          >
            <span className="font-mono-data text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
              {meta.name} · {visible.size}/{built.layers.length} layers
            </span>
            <span className="font-mono-data text-[10px] tracking-widest" style={{ color: 'var(--accent)' }}>
              SVG · Inkscape layers
            </span>
          </div>
        </section>
      </div>

      <style>{`
        .geo-btn {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.55rem 1rem;
          border-radius: 2px;
          transition: opacity 0.15s, box-shadow 0.2s;
        }
        .geo-btn:hover { opacity: 0.92; }
        .geo-btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border: 1px solid var(--primary);
          box-shadow: 0 0 18px rgba(124,109,250,0.25);
        }
        .geo-btn-ghost {
          background: transparent;
          color: var(--secondary-foreground);
          border: 1px solid var(--border);
        }
        .geo-spin {
          animation: geo-rotate 120s linear infinite;
        }
        @keyframes geo-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .geo-spin { animation: none; }
        }
      `}</style>
    </div>
  )
}

function ControlBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono-data text-[10px] tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </span>
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex-1 flex items-center gap-2 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-sm border-0 bg-transparent cursor-pointer"
      />
      <span className="font-mono-data text-[10px] tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
    </label>
  )
}

function ToggleRow({
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
