import { Link } from 'react-router'
import { useEffect, useRef } from 'react'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) * 0.38

      // Slowly rotating outer hexagon
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.003)
      drawPolygon(ctx, 0, 0, R, 6, 'rgba(124,109,250,0.18)', 1)
      ctx.restore()

      // Contra-rotating inner Star of David
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-t * 0.005)
      drawPolygon(ctx, 0, 0, R * 0.6, 3, 'rgba(201,153,58,0.35)', 0.8)
      ctx.rotate(Math.PI)
      drawPolygon(ctx, 0, 0, R * 0.6, 3, 'rgba(124,109,250,0.28)', 0.8)
      ctx.restore()

      // Pulsing center circles
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.04)
      for (let i = 3; i > 0; i--) {
        ctx.beginPath()
        ctx.arc(cx, cy, R * 0.18 * i * (1 + pulse * 0.05 * (4 - i)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(124,109,250,${0.08 * i})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Outer ring dots at 12 positions
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + t * 0.004
        const x = cx + Math.cos(angle) * R * 1.05
        const y = cy + Math.sin(angle) * R * 1.05
        const opacity = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.02 + i))
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,153,58,${opacity})`
        ctx.fill()
      }

      t++
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="sacred-bg">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated sacred geometry canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.85 }}
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-3 mb-10 px-5 py-2 rounded-full font-mono-data text-xs tracking-widest uppercase"
            style={{ border: '1px solid rgba(201,153,58,0.3)', backgroundColor: 'rgba(201,153,58,0.06)', color: 'var(--accent)' }}
          >
            <span className="w-1 h-1 rounded-full pulse-dot" style={{ backgroundColor: 'var(--accent)' }} />
            Spiritual Technology
          </div>

          <h1 className="font-display text-5xl md:text-7xl mb-6 leading-tight tracking-wide">
            <span className="gold-shimmer">OpenClaw</span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed mb-4" style={{ color: 'var(--secondary-foreground)', fontWeight: 300 }}>
            Where ancient pattern meets machine precision.
          </p>
          <p className="text-base leading-relaxed mb-12 max-w-lg mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            A living platform for tools, diagrams, and writings that sit at the intersection of sacred
            systems and computational thought.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/tools"
              className="px-8 py-3.5 rounded-sm font-mono-data text-sm tracking-widest uppercase transition-all hover:opacity-90 hover:shadow-lg"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                letterSpacing: '0.15em',
                boxShadow: '0 0 20px rgba(124,109,250,0.3)',
              }}
            >
              Explore Tools
            </Link>
            <Link
              to="/blog"
              className="px-8 py-3.5 rounded-sm font-mono-data text-sm tracking-widest uppercase transition-all"
              style={{
                border: '1px solid rgba(124,109,250,0.4)',
                color: 'var(--secondary-foreground)',
                letterSpacing: '0.15em',
              }}
            >
              Read the Blog
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
          <span className="font-mono-data text-xs tracking-widest">SCROLL</span>
          <div className="w-px h-10 animate-pulse" style={{ backgroundColor: 'var(--border)' }} />
        </div>
      </section>

      {/* Pillars section */}
      <section className="px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <div className="mb-16">
          <p className="font-mono-data text-xs tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
            — PILLARS
          </p>
          <h2 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--foreground)' }}>
            Three Domains of Practice
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <PillarCard key={i} {...p} />
          ))}
        </div>
      </section>

      {/* Recent writings teaser */}
      <section className="px-6 md:px-12 py-16 max-w-6xl mx-auto" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-mono-data text-xs tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
              — RECENT WRITINGS
            </p>
            <h2 className="font-display text-3xl">From the Archive</h2>
          </div>
          <Link to="/blog" className="nav-link hidden md:block">View All →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURED_POSTS.map((post) => (
            <FeaturedPost key={post.slug} {...post} />
          ))}
        </div>
      </section>

      {/* Mandala divider */}
      <div className="flex justify-center py-16">
        <MandalaSymbol />
      </div>
    </div>
  )
}

function PillarCard({ icon, title, desc, href }: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  return (
    <Link
      to={href}
      className="card-glow block p-8 rounded-sm"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="mb-6">{icon}</div>
      <h3 className="font-display text-lg mb-3 tracking-wide" style={{ color: 'var(--foreground)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>{desc}</p>
    </Link>
  )
}

function FeaturedPost({ slug, title, excerpt, date, tag }: { slug: string; title: string; excerpt: string; date: string; tag: string }) {
  return (
    <Link
      to={`/blog/${slug}`}
      className="card-glow block p-7 rounded-sm"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <span
          className="font-mono-data text-xs px-2.5 py-1 rounded-full tracking-widest uppercase"
          style={{ backgroundColor: 'rgba(124,109,250,0.12)', color: 'var(--primary)', border: '1px solid rgba(124,109,250,0.2)' }}
        >
          {tag}
        </span>
        <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>{date}</span>
      </div>
      <h3 className="font-display text-xl mb-3 leading-snug" style={{ color: 'var(--foreground)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>{excerpt}</p>
    </Link>
  )
}

function MandalaSymbol() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="28" stroke="rgba(124,109,250,0.2)" strokeWidth="0.5" />
      <circle cx="30" cy="30" r="18" stroke="rgba(201,153,58,0.3)" strokeWidth="0.5" />
      <circle cx="30" cy="30" r="8" stroke="rgba(124,109,250,0.4)" strokeWidth="0.5" />
      {[0, 45, 90, 135].map(a => (
        <line
          key={a}
          x1={30 + Math.cos(a * Math.PI / 180) * 28}
          y1={30 + Math.sin(a * Math.PI / 180) * 28}
          x2={30 - Math.cos(a * Math.PI / 180) * 28}
          y2={30 - Math.sin(a * Math.PI / 180) * 28}
          stroke="rgba(124,109,250,0.15)"
          strokeWidth="0.5"
        />
      ))}
      <circle cx="30" cy="30" r="2" fill="var(--accent)" />
    </svg>
  )
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, stroke: string, lineWidth: number) {
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
    const px = x + Math.cos(angle) * r
    const py = y + Math.sin(angle) * r
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

const PILLARS = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <polygon points="18,2 33,26 3,26" stroke="var(--primary)" strokeWidth="1" fill="none" opacity="0.8" />
        <polygon points="18,34 3,10 33,10" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.5" />
        <circle cx="18" cy="18" r="3" fill="var(--primary)" opacity="0.7" />
      </svg>
    ),
    title: 'Sacred Geometry',
    desc: 'Diagrams and visual structures that encode universal patterns — from flower of life to fractal cosmologies.',
    href: '/tools',
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="3" y="6" width="30" height="24" rx="1" stroke="var(--primary)" strokeWidth="0.8" fill="none" opacity="0.6" />
        <line x1="3" y1="12" x2="33" y2="12" stroke="var(--accent)" strokeWidth="0.5" opacity="0.6" />
        <line x1="9" y1="18" x2="27" y2="18" stroke="var(--primary)" strokeWidth="0.5" opacity="0.4" />
        <line x1="9" y1="22" x2="22" y2="22" stroke="var(--primary)" strokeWidth="0.5" opacity="0.4" />
        <circle cx="6" cy="9" r="1.2" fill="var(--accent)" />
      </svg>
    ),
    title: 'Precision Tools',
    desc: 'Interactive instruments for computation, analysis, and planning — built with clarity and intentional design.',
    href: '/tools',
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M6 30 C6 30 12 10 18 10 C24 10 30 28 30 28" stroke="var(--primary)" strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M4 22 L10 16 L16 20 L22 12 L32 18" stroke="var(--accent)" strokeWidth="0.8" fill="none" opacity="0.6" />
      </svg>
    ),
    title: 'Living Archive',
    desc: 'Writings, reflections, and research notes that map the territory between inner inquiry and outer technology.',
    href: '/blog',
  },
]

const FEATURED_POSTS = [
  {
    slug: 'sacred-geometry-and-machine-logic',
    title: 'Sacred Geometry and Machine Logic',
    excerpt: 'On the surprising structural parallels between ancient symbolic systems and modern computational architectures.',
    date: '2026-07-18',
    tag: 'Theory',
  },
  {
    slug: 'building-tools-with-intention',
    title: 'Building Tools With Intention',
    excerpt: 'What it means to design software as a spiritual practice — attention, clarity, and the ethics of craft.',
    date: '2026-06-30',
    tag: 'Practice',
  },
]
