import type { Components } from 'react-markdown'

export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-display text-3xl md:text-4xl mb-6 mt-12 first:mt-0 leading-tight" style={{ color: 'var(--foreground)' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-2xl mb-4 mt-10" style={{ color: 'var(--foreground)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display text-lg mb-3 mt-8" style={{ color: 'var(--foreground)' }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-mono-data text-sm mb-2 mt-6 tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-base leading-8 mb-5" style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="transition-colors"
      style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(124,109,250,0.4)' }}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong style={{ color: 'var(--foreground)', fontWeight: 500 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--secondary-foreground)', fontStyle: 'italic' }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 ml-5 flex flex-col gap-2" style={{ listStyleType: 'none' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 ml-5 flex flex-col gap-2" style={{ listStyleType: 'none', counterReset: 'list-counter' }}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => {
    const isOrdered = (props as { ordered?: boolean }).ordered
    return (
      <li
        className="text-base leading-7 flex items-start gap-3"
        style={{ color: 'var(--muted-foreground)', fontWeight: 300, counterIncrement: isOrdered ? 'list-counter' : undefined }}
      >
        {isOrdered ? (
          <span className="font-mono-data text-xs shrink-0 mt-1" style={{ color: 'var(--accent)', minWidth: '1.5rem' }}>
            {/* counter rendered via CSS workaround — just use a static span wrapper */}
          </span>
        ) : (
          <span className="shrink-0 mt-2.5 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
        )}
        <span>{children}</span>
      </li>
    )
  },
  blockquote: ({ children }) => (
    <blockquote
      className="my-6 pl-5 py-1"
      style={{
        borderLeft: '2px solid var(--accent)',
        backgroundColor: 'rgba(201,153,58,0.04)',
        borderRadius: '0 2px 2px 0',
      }}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) return null // handled by pre
    return (
      <code
        className="font-mono-data text-sm px-1.5 py-0.5 rounded"
        style={{ backgroundColor: 'rgba(124,109,250,0.12)', color: 'var(--primary)', border: '1px solid rgba(124,109,250,0.18)' }}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre
      className="font-mono-data text-sm p-5 rounded-sm overflow-x-auto mb-6 leading-7"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--secondary-foreground)' }}
    >
      {children}
    </pre>
  ),
  hr: () => (
    <hr className="my-10" style={{ borderColor: 'var(--border)' }} />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6">
      <table className="w-full font-mono-data text-sm" style={{ borderCollapse: 'collapse' }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ borderBottom: '1px solid var(--border)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      className="text-left px-4 py-2.5 font-mono-data text-xs tracking-widest uppercase"
      style={{ color: 'var(--accent)' }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-4 py-2.5 text-sm"
      style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid rgba(124,109,250,0.06)' }}
    >
      {children}
    </td>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ''}
      className="rounded-sm w-full object-cover my-6"
      style={{ border: '1px solid var(--border)', maxHeight: '420px' }}
    />
  ),
}
