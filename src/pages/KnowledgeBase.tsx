import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownComponents } from '../lib/markdownComponents'
import { KB_CATEGORIES, KB_ENTRIES, type KBEntry } from '../data/knowledgeBase'

export default function KnowledgeBase() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>(KB_ENTRIES[0].id)

  const filtered = useMemo(() => {
    return KB_ENTRIES.filter(e => {
      const matchCat = activeCategory === 'All' || e.category === activeCategory
      const q = query.toLowerCase()
      const matchQ = !q || e.title.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)) || e.content.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [activeCategory, query])

  const selected = KB_ENTRIES.find(e => e.id === selectedId) ?? filtered[0] ?? null

  // When filter narrows out the selected entry, auto-select first result
  const displayedEntry: KBEntry | null = filtered.find(e => e.id === selectedId) ? selected : (filtered[0] ?? null)

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside
        className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col"
        style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
      >
        {/* Sidebar header */}
        <div className="px-5 pt-10 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-mono-data text-xs tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            — KNOWLEDGE BASE
          </p>
          <h1 className="font-display text-2xl mb-5" style={{ color: 'var(--foreground)' }}>
            Reference
          </h1>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search entries..."
              value={query}
              onChange={e => {
                setQuery(e.target.value)
              }}
              className="w-full px-4 py-2 rounded-sm font-mono-data text-xs outline-none transition-all"
              style={{
                backgroundColor: 'rgba(124,109,250,0.06)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* Category pills */}
        <div className="px-5 py-4 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {KB_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="font-mono-data text-[10px] px-2.5 py-1 rounded-full tracking-widest uppercase transition-all"
              style={{
                backgroundColor: activeCategory === cat ? 'var(--primary)' : 'rgba(124,109,250,0.06)',
                color: activeCategory === cat ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Entry list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-5 py-8 font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
              No entries found.
            </p>
          )}
          {filtered.map(entry => {
            const isActive = displayedEntry?.id === entry.id
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                className="w-full text-left px-5 py-3.5 transition-all group"
                style={{
                  backgroundColor: isActive ? 'rgba(124,109,250,0.1)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-display text-sm leading-snug transition-colors"
                    style={{ color: isActive ? 'var(--foreground)' : 'var(--secondary-foreground)' }}
                  >
                    {entry.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono-data text-[10px] tracking-widest uppercase"
                    style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
                  >
                    {entry.category}
                  </span>
                  <span className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                    · {entry.updated}
                  </span>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="font-mono-data text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
            {KB_ENTRIES.length} entries &nbsp;·&nbsp; {filtered.length} shown
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {displayedEntry ? (
          <article className="max-w-3xl mx-auto px-6 md:px-12 py-12 pb-24">
            {/* Entry meta bar */}
            <div
              className="flex flex-wrap items-center gap-4 pb-6 mb-8"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span
                className="font-mono-data text-xs px-2.5 py-1 rounded-full tracking-widest uppercase"
                style={{ backgroundColor: 'rgba(124,109,250,0.1)', color: 'var(--primary)', border: '1px solid rgba(124,109,250,0.18)' }}
              >
                {displayedEntry.category}
              </span>
              {displayedEntry.tags.map(tag => (
                <span key={tag} className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  #{tag}
                </span>
              ))}
              <span className="ml-auto font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Updated {displayedEntry.updated}
              </span>
            </div>

            {/* Rendered markdown */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {displayedEntry.content}
            </ReactMarkdown>

            {/* Bottom nav */}
            <div className="mt-16 pt-8 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
              <PrevNext entries={filtered} currentId={displayedEntry.id} onSelect={setSelectedId} />
            </div>
          </article>
        ) : (
          <div className="flex items-center justify-center h-full py-32">
            <p className="font-mono-data text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Select an entry from the sidebar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function PrevNext({
  entries,
  currentId,
  onSelect,
}: {
  entries: KBEntry[]
  currentId: string
  onSelect: (id: string) => void
}) {
  const idx = entries.findIndex(e => e.id === currentId)
  const prev = idx > 0 ? entries[idx - 1] : null
  const next = idx < entries.length - 1 ? entries[idx + 1] : null

  return (
    <>
      <div>
        {prev && (
          <button onClick={() => onSelect(prev.id)} className="text-left group">
            <p className="font-mono-data text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--muted-foreground)' }}>
              ← Previous
            </p>
            <p className="font-display text-sm group-hover:text-white transition-colors" style={{ color: 'var(--secondary-foreground)' }}>
              {prev.title}
            </p>
          </button>
        )}
      </div>
      <div className="text-right">
        {next && (
          <button onClick={() => onSelect(next.id)} className="text-right group">
            <p className="font-mono-data text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Next →
            </p>
            <p className="font-display text-sm group-hover:text-white transition-colors" style={{ color: 'var(--secondary-foreground)' }}>
              {next.title}
            </p>
          </button>
        )}
      </div>
    </>
  )
}
