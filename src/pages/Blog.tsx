import { Link } from 'react-router'
import { useState } from 'react'

const TAGS = ['All', 'Theory', 'Practice', 'Geometry', 'Tools', 'Philosophy']

const POSTS = [
  {
    slug: 'sacred-geometry-and-machine-logic',
    title: 'Sacred Geometry and Machine Logic',
    excerpt: 'On the surprising structural parallels between ancient symbolic systems and modern computational architectures — why Fibonacci appears in sorting algorithms and the Vesica Piscis in lens design.',
    date: '2026-07-18',
    readTime: '9 min',
    tag: 'Theory',
    featured: true,
  },
  {
    slug: 'building-tools-with-intention',
    title: 'Building Tools With Intention',
    excerpt: 'What it means to design software as a spiritual practice — attention, clarity, and the ethics of craft. A meditation on the invisible dimension of engineering.',
    date: '2026-06-30',
    readTime: '7 min',
    tag: 'Practice',
    featured: true,
  },
  {
    slug: 'flower-of-life-as-data-structure',
    title: 'The Flower of Life as a Data Structure',
    excerpt: 'Mapping the hexagonal lattice of the Flower of Life onto graph theory reveals a naturally optimal topology for distributed systems.',
    date: '2026-06-12',
    readTime: '12 min',
    tag: 'Geometry',
    featured: false,
  },
  {
    slug: 'on-svg-as-a-sacred-medium',
    title: 'On SVG as a Sacred Medium',
    excerpt: 'The coordinate system of the browser is not neutral. When we draw with vectors, we are practicing a kind of geometry — intentional or not.',
    date: '2026-05-28',
    readTime: '6 min',
    tag: 'Tools',
    featured: false,
  },
  {
    slug: 'attention-and-computation',
    title: 'Attention and Computation',
    excerpt: 'The transformer architecture — the engine of modern AI — shares a deep vocabulary with contemplative practices around the direction of awareness.',
    date: '2026-05-05',
    readTime: '14 min',
    tag: 'Theory',
    featured: false,
  },
  {
    slug: 'number-as-archetype',
    title: 'Number as Archetype',
    excerpt: 'Following Pythagoras and von Franz into the symbolic dimension of mathematics — where integers carry qualitative weight beyond their quantitative role.',
    date: '2026-04-22',
    readTime: '11 min',
    tag: 'Philosophy',
    featured: false,
  },
  {
    slug: 'the-mandala-of-version-control',
    title: 'The Mandala of Version Control',
    excerpt: "Git's directed acyclic graph of commits mirrors the structure of certain Tibetan cosmological maps. Both are technologies for navigating time.",
    date: '2026-04-03',
    readTime: '8 min',
    tag: 'Practice',
    featured: false,
  },
]

export default function Blog() {
  const [activeTag, setActiveTag] = useState('All')
  const [query, setQuery] = useState('')

  const filtered = POSTS.filter(p => {
    const matchTag = activeTag === 'All' || p.tag === activeTag
    const matchQuery = !query || p.title.toLowerCase().includes(query.toLowerCase()) || p.excerpt.toLowerCase().includes(query.toLowerCase())
    return matchTag && matchQuery
  })

  const featured = filtered.filter(p => p.featured)
  const rest = filtered.filter(p => !p.featured)

  return (
    <div className="px-6 md:px-12 max-w-6xl mx-auto pb-24">
      {/* Page header */}
      <div className="pt-16 pb-14" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="font-mono-data text-xs tracking-widest mb-5" style={{ color: 'var(--accent)' }}>
          — THE ARCHIVE
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="font-display text-4xl md:text-5xl mb-4">
              Blog
            </h1>
            <p className="text-base" style={{ color: 'var(--muted-foreground)', fontWeight: 300, maxWidth: '36ch' }}>
              Writings on spiritual technology, sacred geometry, and the philosophy of precision tools.
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search writings..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-4 py-2.5 rounded-sm font-mono-data text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 py-8">
        {TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className="font-mono-data text-xs px-3.5 py-1.5 rounded-full tracking-widest uppercase transition-all"
            style={{
              backgroundColor: activeTag === tag ? 'var(--primary)' : 'var(--card)',
              color: activeTag === tag ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              border: `1px solid ${activeTag === tag ? 'var(--primary)' : 'var(--border)'}`,
              boxShadow: activeTag === tag ? '0 0 12px rgba(124,109,250,0.3)' : 'none',
            }}
          >
            {tag}
          </button>
        ))}
        <span className="ml-auto font-mono-data text-xs self-center" style={{ color: 'var(--muted-foreground)' }}>
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Featured posts */}
      {featured.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {featured.map(post => (
            <FeaturedCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-0" style={{ border: '1px solid var(--border)', borderRadius: '2px' }}>
          {rest.map((post, i) => (
            <PostRow key={post.slug} post={post} last={i === rest.length - 1} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-mono-data text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No writings match your query.
          </p>
        </div>
      )}
    </div>
  )
}

type Post = typeof POSTS[number]

function FeaturedCard({ post }: { post: Post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="card-glow block p-7 rounded-sm"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <TagBadge tag={post.tag} />
        <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>{post.readTime} read</span>
      </div>
      <h2 className="font-display text-xl mb-3 leading-snug" style={{ color: 'var(--foreground)' }}>{post.title}</h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>{post.excerpt}</p>
      <div className="flex items-center justify-between">
        <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>{post.date}</span>
        <span className="font-mono-data text-xs" style={{ color: 'var(--primary)' }}>Read →</span>
      </div>
    </Link>
  )
}

function PostRow({ post, last }: { post: Post; last: boolean }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="flex items-start gap-6 px-6 py-5 transition-all hover:bg-white/[0.02] group"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <TagBadge tag={post.tag} small />
          <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>{post.date}</span>
        </div>
        <h3 className="font-display text-base mb-1.5 group-hover:text-white transition-colors" style={{ color: 'var(--foreground)' }}>
          {post.title}
        </h3>
        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
          {post.excerpt}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
        <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>{post.readTime}</span>
        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

function TagBadge({ tag, small }: { tag: string; small?: boolean }) {
  return (
    <span
      className={`font-mono-data tracking-widest uppercase rounded-full ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ backgroundColor: 'rgba(124,109,250,0.1)', color: 'var(--primary)', border: '1px solid rgba(124,109,250,0.18)' }}
    >
      {tag}
    </span>
  )
}
