import { Link, useParams } from 'react-router'

const POSTS: Record<string, { title: string; date: string; tag: string; readTime: string; content: string[] }> = {
  'sacred-geometry-and-machine-logic': {
    title: 'Sacred Geometry and Machine Logic',
    date: '2026-07-18',
    tag: 'Theory',
    readTime: '9 min',
    content: [
      "There is a moment in every deep study of mathematics when the subject becomes uncanny. The numbers stop being merely useful and start being strange — present in places you did not invite them, structuring phenomena you thought were unrelated. The Fibonacci sequence appears in the spiral of a nautilus, then in the branching of a river delta, then in the time complexity of certain sorting algorithms.",
      "Ancient geometers noticed this first. The builders of Chartres Cathedral and the architects of Mayan temples were not being decorative when they encoded the ratio φ into their stonework — they were claiming that the building participated in a deeper order, that it was resonant with something real.",
      "What is striking, from our vantage in 2026, is that modern computational architectures have arrived at analogous structures through entirely different means. Not through mystical intuition but through engineering necessity — through the unforgiving discipline of having to actually work.",
      "Consider the hexagonal lattice. The honeybee's comb is the most efficient tessellation of a plane with equal cells. The same structure appears in graphene, in the close-packing of spheres, and — less obviously — in the topology of highly efficient hash tables. The hex grid minimizes edge length per area. This is not magic; it is geometry. But the ancients who drew mandalas on hexagonal grids were not wrong to sense that they were touching something important.",
      "The Flower of Life, that overlapping-circles diagram carved into Egyptian temples and drawn in Leonardo's notebooks, is a graph. Each circle is a node; each intersection is an edge. The result is a network with extremely regular local connectivity — every interior node has the same degree, the same number of neighbors. Graph theorists call this property 'regularity,' and it has profound implications for distributed systems: a regular graph is inherently fault-tolerant, since no single node is disproportionately load-bearing.",
      "I am not arguing that ancient geometers were secretly designing distributed databases. I am arguing something subtler: that certain structural forms recur across domains not because of direct transmission but because they are optimal, and optimal forms get discovered wherever the pressure to be efficient is high enough. The sacred and the technical are two different search processes arriving at the same attractors.",
      "This should change how we approach both. If our computational tools are unknowingly re-deriving ancient pattern, we might study that pattern consciously — not as mysticism, but as a research tradition with a very long head start. And if our sacred diagrams encode structural truths that we are only now formalizing, we might read them with new eyes: as compressed technical literature, transmitted in the only medium that could survive millennia.",
    ],
  },
  'building-tools-with-intention': {
    title: 'Building Tools With Intention',
    date: '2026-06-30',
    tag: 'Practice',
    readTime: '7 min',
    content: [
      "The word 'tool' comes from a Proto-Germanic root meaning something shaped, something made — an artifact that extends the body's capacity. For most of human history, tools were also ritually significant. The smith's forge was sacred space. The carpenter's square was blessed. The instrument was never merely functional; it was also a statement about the maker's relationship to matter, to time, to other people who would use the thing.",
      "Software broke this continuity, or seemed to. Code is invisible, weightless, endlessly copyable. It doesn't wear out. You can't hold it. The intimacy between maker and tool that was built into the physical act of shaping metal or wood seems to evaporate in front of a screen.",
      "I think this is wrong. The intimacy is still there, but it has moved inward. What we shape when we write software is attention itself — the possible directions of thought for anyone who uses what we build. A well-designed tool narrows the distance between intention and action. A poorly designed one adds friction, generates confusion, teaches the user to distrust their own cognition.",
      "This is not metaphor. When a developer writes an API, they are deciding what future developers will find easy and what they will find hard. They are encoding assumptions about use-cases, about the mental models of their users, about what counts as an error and what counts as valid input. These are philosophical decisions, and they propagate.",
      "Intentional tool-building means making these decisions consciously. It means asking not just 'does this work?' but 'what does this teach?' Not just 'is this efficient?' but 'is this honest?' An honest tool does not hide its limitations. It fails loudly and informatively. It exposes its own structure to inspection. It treats the user as someone capable of understanding it, not just consuming it.",
      "The spiritual dimension of this practice is not about mysticism or ritual (though ritual has its uses). It is about the quality of attention you bring to the work. Attention that is hurried, distracted, or defensive produces tools that are hurried, distracted, or defensive. Attention that is patient, curious, and respectful of the user's autonomy produces tools that carry those qualities into the world.",
      "OpenClaw is an attempt to build this way — slowly, clearly, with care for what each component teaches about itself.",
    ],
  },
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? POSTS[slug] : null

  if (!post) {
    return (
      <div className="px-6 md:px-12 max-w-3xl mx-auto py-32 text-center">
        <p className="font-display text-3xl mb-6">404</p>
        <p className="font-mono-data text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
          This writing does not yet exist.
        </p>
        <Link to="/blog" className="nav-link">← Back to Archive</Link>
      </div>
    )
  }

  return (
    <article className="px-6 md:px-12 max-w-3xl mx-auto pb-32">
      {/* Breadcrumb */}
      <div className="pt-12 pb-8">
        <Link to="/blog" className="nav-link text-xs">← Archive</Link>
      </div>

      {/* Header */}
      <header className="pb-12" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-6">
          <span
            className="font-mono-data text-xs px-2.5 py-1 rounded-full tracking-widest uppercase"
            style={{ backgroundColor: 'rgba(124,109,250,0.1)', color: 'var(--primary)', border: '1px solid rgba(124,109,250,0.18)' }}
          >
            {post.tag}
          </span>
          <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>{post.readTime} read</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl leading-tight mb-5" style={{ color: 'var(--foreground)' }}>
          {post.title}
        </h1>
        <p className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Published {post.date} &nbsp;·&nbsp; OpenClaw Archive
        </p>
      </header>

      {/* Body */}
      <div className="pt-12 flex flex-col gap-7">
        {post.content.map((para, i) => (
          <p
            key={i}
            className="text-base leading-8"
            style={{ color: i === 0 ? 'var(--secondary-foreground)' : 'var(--muted-foreground)', fontWeight: 300 }}
          >
            {para}
          </p>
        ))}
      </div>

      {/* Footer divider */}
      <div className="mt-20 pt-8 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <Link to="/blog" className="nav-link">← All Writings</Link>
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          <span className="font-mono-data text-xs" style={{ color: 'var(--muted-foreground)' }}>OpenClaw</span>
        </div>
      </div>
    </article>
  )
}
