import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router'

type Props = {
  compact?: boolean
  embedded?: boolean
}

const FREQUENCIES = [
  { hz: 174, label: 'Pain Relief', subtitle: 'Grounding & Security', color: '#6366f1', glow: 'rgba(99,102,241,0.6)', root: 3 },
  { hz: 285, label: 'Regeneration', subtitle: 'Cellular Healing', color: '#06b6d4', glow: 'rgba(6,182,212,0.6)', root: 6 },
  { hz: 396, label: 'Liberate Fear', subtitle: 'Release Guilt', color: '#10b981', glow: 'rgba(16,185,129,0.6)', root: 9 },
  { hz: 417, label: 'Facilitate Change', subtitle: 'Undo Situations', color: '#84cc16', glow: 'rgba(132,204,22,0.6)', root: 3 },
  { hz: 528, label: 'Miracles', subtitle: 'Love Frequency', color: '#f59e0b', glow: 'rgba(245,158,11,0.6)', root: 6 },
  { hz: 639, label: 'Connection', subtitle: 'Harmonize Relations', color: '#f97316', glow: 'rgba(249,115,22,0.6)', root: 9 },
  { hz: 741, label: 'Intuition', subtitle: 'Awaken & Cleanse', color: '#ef4444', glow: 'rgba(239,68,68,0.6)', root: 3 },
  { hz: 852, label: 'Spiritual Order', subtitle: 'Return to Order', color: '#ec4899', glow: 'rgba(236,72,153,0.6)', root: 6 },
  { hz: 963, label: 'Higher Self', subtitle: 'Divine Connection', color: '#a78bfa', glow: 'rgba(167,139,250,0.6)', root: 9 },
]

type FreqData = (typeof FREQUENCIES)[0]

function WaveCanvas({ freq, isPlaying, analyser }: { freq: FreqData; isPlaying: boolean; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(0)
  const rafRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (analyser) {
      const buf = new Uint8Array(analyser.frequencyBinCount)
      dataArrayRef.current = buf
    } else {
      dataArrayRef.current = null
    }
  }, [analyser])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const amplitude = isPlaying ? H * 0.38 : H * 0.18
      const cycles = 3.5
      const speed = isPlaying ? 0.045 : 0.012

      phaseRef.current += speed

      // trails — draw 4 layers with decreasing opacity for glow effect
      for (let layer = 3; layer >= 0; layer--) {
        const t = layer / 3
        const alpha = isPlaying ? (1 - t) * 0.85 + 0.1 : (1 - t) * 0.3 + 0.05
        const lineW = isPlaying ? (4 - layer) * 1.4 : (4 - layer) * 0.7
        const phaseOffset = layer * 0.08

        ctx.beginPath()
        ctx.strokeStyle = freq.color
        ctx.globalAlpha = alpha
        ctx.lineWidth = lineW
        ctx.shadowColor = freq.glow
        ctx.shadowBlur = isPlaying ? 18 - layer * 4 : 6 - layer

        for (let x = 0; x <= W; x += 2) {
          const progress = x / W
          const sine = Math.sin(progress * Math.PI * 2 * cycles - phaseRef.current - phaseOffset)
          const env = Math.sin(progress * Math.PI)
          const y = H / 2 + sine * amplitude * env
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [freq, isPlaying])

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={180}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

function FreqCard({ freq, isActive, onClick }: { freq: FreqData; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group text-left transition-all duration-300"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${freq.color}22, ${freq.color}08)`
          : 'rgba(13,15,30,0.8)',
        border: `1px solid ${isActive ? freq.color + '88' : 'rgba(124,106,247,0.12)'}`,
        borderRadius: '10px',
        padding: '18px 20px',
        cursor: 'pointer',
        boxShadow: isActive ? `0 0 24px ${freq.glow}, inset 0 0 20px ${freq.color}11` : 'none',
        transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {isActive && (
        <span
          className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
          style={{ background: freq.color, boxShadow: `0 0 8px ${freq.glow}` }}
        />
      )}
      <div
        className="text-xs font-mono mb-1"
        style={{ color: isActive ? freq.color : 'var(--muted-foreground)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}
      >
        {freq.hz} Hz · root {freq.root}
      </div>
      <div
        className="text-sm font-semibold mb-0.5"
        style={{ fontFamily: "'Cinzel', serif", color: isActive ? '#e8e8f0' : 'var(--card-foreground)', fontSize: '13px' }}
      >
        {freq.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {freq.subtitle}
      </div>
    </button>
  )
}

export default function SolfeggioFrequencyVisualizer({ compact, embedded }: Props) {
  const [active, setActive] = useState<FreqData | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.28)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const stopTone = useCallback(() => {
    if (oscRef.current) {
      try { oscRef.current.stop() } catch { /* already stopped */ }
      oscRef.current.disconnect()
      oscRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const playTone = useCallback((freq: FreqData) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    stopTone()

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.04)
    gainRef.current = gain

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq.hz, ctx.currentTime)
    oscRef.current = osc

    osc.connect(analyser)
    analyser.connect(gain)
    gain.connect(ctx.destination)
    osc.start()

    setIsPlaying(true)
  }, [stopTone, volume])

  const handleSelect = (freq: FreqData) => {
    if (active?.hz === freq.hz && isPlaying) {
      stopTone()
      setActive(null)
    } else {
      setActive(freq)
      playTone(freq)
    }
  }

  const handleStop = () => {
    stopTone()
    setActive(null)
  }

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(v, audioCtxRef.current.currentTime)
    }
  }

  useEffect(() => () => stopTone(), [stopTone])

  const displayFreq = active ?? FREQUENCIES[4]
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

      {/* Header */}
      <header className={compact ? 'mb-6' : 'mb-10 text-center'} style={{ borderBottom: compact ? '1px solid var(--border)' : 'none' }}>
        <p
          className="font-mono-data text-xs tracking-widest mb-3"
          style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}
        >
          — SACRED NUMEROLOGY · ROOTS 3 · 6 · 9
        </p>
        <h1
          className={`font-display ${compact ? 'text-2xl mb-2' : 'text-4xl md:text-5xl mb-3'}`}
          style={{
            color: 'var(--foreground)',
            letterSpacing: '0.04em',
            textShadow: '0 0 40px rgba(167,139,250,0.3)',
          }}
        >
          Solfeggio Frequencies
        </h1>
        <p className={`text-sm ${compact ? 'mb-4' : 'max-w-md mx-auto mb-6'}`} style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontWeight: 300 }}>
          Nine sacred tones derived from ancient numerology. Each reduces to a digital root of 3, 6, or 9 — the pattern Tesla called the key to the universe.
        </p>
      </header>

      {/* Wave Visualizer */}
      <section className="mb-8">
        <div
          className="relative w-full mx-auto overflow-hidden"
          style={{
            maxWidth: '900px',
            borderRadius: '16px',
            border: `1px solid ${displayFreq.color}33`,
            background: 'rgba(7,8,15,0.9)',
            boxShadow: `0 0 60px ${displayFreq.glow}22, inset 0 0 80px rgba(0,0,0,0.5)`,
            height: '180px',
            transition: 'border-color 0.5s, box-shadow 0.5s',
          }}
        >
          {/* Frequency label */}
          <div
            className="absolute top-4 left-5 z-10 font-mono text-xs"
            style={{ color: displayFreq.color, fontFamily: "'JetBrains Mono', monospace", opacity: 0.8 }}
          >
            {displayFreq.hz} Hz — {displayFreq.label}
          </div>

          {/* Playing indicator */}
          {isPlaying && (
            <div
              className="absolute top-4 right-5 z-10 flex items-center gap-1.5 text-xs"
              style={{ color: displayFreq.color, fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: displayFreq.color }} />
              LIVE
            </div>
          )}

          <WaveCanvas freq={displayFreq} isPlaying={isPlaying} analyser={analyserRef.current} />

          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '100% 45px',
          }} />
        </div>
      </section>

      {/* Digital root legend */}
      <div className="flex justify-center gap-8 mb-8">
        {[3, 6, 9].map(root => (
          <div key={root} className="flex items-center gap-2">
            <div className="flex gap-1">
              {FREQUENCIES.filter(f => f.root === root).map(f => (
                <span key={f.hz} className="w-2 h-2 rounded-full" style={{ background: f.color }} />
              ))}
            </div>
            <span className="text-xs font-mono-data" style={{ color: 'var(--muted-foreground)' }}>
              root {root}
            </span>
          </div>
        ))}
      </div>

      {/* Frequency Grid */}
      <section className="pb-8">
        <div
          className="mx-auto grid gap-3"
          style={{
            maxWidth: '900px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}
        >
          {FREQUENCIES.map(freq => (
            <FreqCard
              key={freq.hz}
              freq={freq}
              isActive={active?.hz === freq.hz}
              onClick={() => handleSelect(freq)}
            />
          ))}
        </div>
      </section>

      {/* Controls */}
      <footer
        className="sticky bottom-0 px-6 py-4 rounded-lg"
        style={{
          background: 'linear-gradient(to top, rgba(7,8,15,0.98) 60%, transparent)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4" style={{ maxWidth: '900px' }}>
          <div className="flex items-center gap-3">
            {active ? (
              <>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: active.color, boxShadow: `0 0 8px ${active.glow}`, animation: isPlaying ? 'pulse 1.5s infinite' : 'none' }}
                />
                <span className="text-sm font-display" style={{ color: 'var(--foreground)' }}>
                  {active.hz} Hz — {active.label}
                </span>
              </>
            ) : (
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Select a frequency above to begin</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted-foreground)' }}>
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 cursor-pointer"
                style={{ accentColor: '#a78bfa' }}
              />
            </div>

            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying}
              className="px-5 py-2 text-sm font-medium transition-all duration-200"
              style={{
                fontFamily: "'Cinzel', serif",
                borderRadius: '6px',
                border: '1px solid rgba(239,68,68,0.4)',
                background: isPlaying ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.05)',
                color: isPlaying ? '#ef4444' : 'var(--muted-foreground)',
                cursor: isPlaying ? 'pointer' : 'not-allowed',
                letterSpacing: '0.06em',
              }}
            >
              Stop
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
