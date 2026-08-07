import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center sacred-bg">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-10 opacity-50">
        <circle cx="40" cy="40" r="38" stroke="var(--primary)" strokeWidth="0.6" strokeDasharray="4 4" />
        <circle cx="40" cy="40" r="24" stroke="var(--accent)" strokeWidth="0.6" />
        <line x1="28" y1="28" x2="52" y2="52" stroke="var(--primary)" strokeWidth="0.6" />
        <line x1="52" y1="28" x2="28" y2="52" stroke="var(--primary)" strokeWidth="0.6" />
      </svg>
      <p className="font-mono-data text-xs tracking-widest mb-4" style={{ color: 'var(--accent)' }}>404</p>
      <h1 className="font-display text-3xl md:text-4xl mb-5">Page Not Found</h1>
      <p className="text-base mb-10" style={{ color: 'var(--muted-foreground)', fontWeight: 300, maxWidth: '32ch' }}>
        This path does not exist in the current map. Return to a known location.
      </p>
      <Link
        to="/"
        className="font-mono-data text-sm tracking-widest uppercase px-7 py-3 rounded-sm transition-all hover:opacity-90"
        style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', letterSpacing: '0.15em' }}
      >
        Return Home
      </Link>
    </div>
  )
}
