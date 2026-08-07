import { Outlet, NavLink, Link } from 'react-router'
import { useState } from 'react'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/blog', label: 'Blog' },
  { to: '/tools', label: 'Tools' },
  { to: '/knowledge', label: 'Knowledge' },
]

export default function Root() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5"
        style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(6,6,15,0.82)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-3 group">
          <LogoMark />
          <span className="font-display text-sm tracking-widest uppercase" style={{ color: 'var(--foreground)', letterSpacing: '0.25em' }}>
            OpenClaw
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
            v0.1.0
          </span>
          <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ backgroundColor: 'var(--accent)' }} />
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-px transition-all" style={{ backgroundColor: menuOpen ? 'var(--primary)' : 'var(--foreground)' }} />
          <span className="block w-5 h-px transition-all" style={{ backgroundColor: menuOpen ? 'var(--primary)' : 'var(--foreground)' }} />
          <span className="block w-3 h-px transition-all" style={{ backgroundColor: menuOpen ? 'var(--primary)' : 'var(--foreground)' }} />
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-center items-center gap-8"
          style={{ backgroundColor: 'rgba(6,6,15,0.97)', backdropFilter: 'blur(24px)' }}
        >
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `font-display text-2xl tracking-widest uppercase transition-colors ${isActive ? 'gold-shimmer' : ''}`
              }
              style={({ isActive }) => ({ color: isActive ? undefined : 'var(--foreground)' })}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="px-6 md:px-12 py-8 mt-16 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <LogoMark small />
          <span className="font-display text-xs tracking-widest uppercase" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.2em' }}>
            OpenClaw
          </span>
        </div>
        <p className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
          © {new Date().getFullYear()} &nbsp;·&nbsp; Spiritual Technology
        </p>
        <div className="flex gap-6">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className="nav-link text-xs">{label}</NavLink>
          ))}
        </div>
      </footer>
    </div>
  )
}

function LogoMark({ small }: { small?: boolean }) {
  const size = small ? 20 : 28
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer hexagon */}
      <polygon
        points="14,1 25.5,7.5 25.5,20.5 14,27 2.5,20.5 2.5,7.5"
        stroke="var(--accent)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.7"
      />
      {/* Inner triangle up */}
      <polygon
        points="14,5 22,19 6,19"
        stroke="var(--primary)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.85"
      />
      {/* Inner triangle down */}
      <polygon
        points="14,23 6,9 22,9"
        stroke="var(--primary)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.45"
      />
      {/* Center dot */}
      <circle cx="14" cy="14" r="1.5" fill="var(--accent)" />
    </svg>
  )
}
