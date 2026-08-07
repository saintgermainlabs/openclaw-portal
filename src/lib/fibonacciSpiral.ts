/** Fibonacci rectangles, quarter-circle spiral, and golden logarithmic spiral. */

export const PHI = (1 + Math.sqrt(5)) / 2

export type Pt = { x: number; y: number }

export type FibSquare = {
  n: number
  value: number
  x: number
  y: number
  size: number
  /** Direction attached: 0=E, 1=N, 2=W, 3=S */
  dir: number
}

export type ArcSeg = {
  cx: number
  cy: number
  r: number
  startAngle: number
  /** +π/2 clockwise, −π/2 counter */
  sweep: number
}

export function fibonacci(count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [1]
  const seq = [1, 1]
  while (seq.length < count) {
    seq.push(seq[seq.length - 1] + seq[seq.length - 2])
  }
  return seq.slice(0, count)
}

/**
 * Fibonacci squares in a clockwise spiral (SVG y-down).
 * F1 at origin; F2 east; then N, W, S, E, …
 */
export function buildFibSquares(terms: number, scale = 1): FibSquare[] {
  const fib = fibonacci(Math.max(terms, 1))
  const squares: FibSquare[] = []

  squares.push({ n: 1, value: fib[0], x: 0, y: 0, size: fib[0] * scale, dir: 0 })
  if (terms === 1) return squares

  squares.push({
    n: 2,
    value: fib[1],
    x: fib[0] * scale,
    y: 0,
    size: fib[1] * scale,
    dir: 0,
  })

  let minX = 0
  let minY = 0
  let maxX = (fib[0] + fib[1]) * scale
  let maxY = Math.max(fib[0], fib[1]) * scale
  let dir = 1

  for (let i = 2; i < terms; i++) {
    const s = fib[i] * scale
    let x = 0
    let y = 0
    if (dir === 0) {
      x = maxX
      y = minY
    } else if (dir === 1) {
      x = minX
      y = minY - s
    } else if (dir === 2) {
      x = minX - s
      y = minY
    } else {
      x = minX
      y = maxY
    }

    squares.push({ n: i + 1, value: fib[i], x, y, size: s, dir })
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + s)
    maxY = Math.max(maxY, y + s)
    dir = (dir + 1) % 4
  }

  return squares
}

function squareCorners(sq: FibSquare): Pt[] {
  return [
    { x: sq.x, y: sq.y },
    { x: sq.x + sq.size, y: sq.y },
    { x: sq.x + sq.size, y: sq.y + sq.size },
    { x: sq.x, y: sq.y + sq.size },
  ]
}

function near(a: Pt, b: Pt, eps = 1e-6): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < eps
}

/**
 * Quarter-circle arcs with continuous endpoints (prefers clockwise).
 */
export function fibArcs(squares: FibSquare[]): ArcSeg[] {
  if (squares.length === 0) return []

  const arcs: ArcSeg[] = []
  const first = squares[0]
  // Center bottom-left, start top-left → clockwise to bottom-right
  const firstArc: ArcSeg = {
    cx: first.x,
    cy: first.y + first.size,
    r: first.size,
    startAngle: -Math.PI / 2,
    sweep: Math.PI / 2,
  }
  arcs.push(firstArc)
  let tip: Pt = {
    x: firstArc.cx + firstArc.r * Math.cos(firstArc.startAngle + firstArc.sweep),
    y: firstArc.cy + firstArc.r * Math.sin(firstArc.startAngle + firstArc.sweep),
  }

  for (let i = 1; i < squares.length; i++) {
    const sq = squares[i]
    const corners = squareCorners(sq)
    const r = sq.size
    let found: ArcSeg | null = null
    let nextTip = tip

    for (const center of corners) {
      const dist = Math.hypot(tip.x - center.x, tip.y - center.y)
      if (Math.abs(dist - r) > 1e-5) continue
      const startAngle = Math.atan2(tip.y - center.y, tip.x - center.x)

      for (const sweep of [Math.PI / 2, -Math.PI / 2]) {
        const endAngle = startAngle + sweep
        const end = {
          x: center.x + r * Math.cos(endAngle),
          y: center.y + r * Math.sin(endAngle),
        }
        if (corners.some((c) => near(c, end))) {
          // Prefer clockwise when both work
          if (!found || sweep > 0) {
            found = { cx: center.x, cy: center.y, r, startAngle, sweep }
            nextTip = end
          }
        }
      }
    }

    if (found) {
      arcs.push(found)
      tip = nextTip
    }
  }

  return arcs
}

export function arcPath(arc: ArcSeg): string {
  const a0 = arc.startAngle
  const a1 = arc.startAngle + arc.sweep
  const x0 = arc.cx + arc.r * Math.cos(a0)
  const y0 = arc.cy + arc.r * Math.sin(a0)
  const x1 = arc.cx + arc.r * Math.cos(a1)
  const y1 = arc.cy + arc.r * Math.sin(a1)
  const large = Math.abs(arc.sweep) > Math.PI ? 1 : 0
  const sweepFlag = arc.sweep > 0 ? 1 : 0
  return `M ${fmt(x0)} ${fmt(y0)} A ${fmt(arc.r)} ${fmt(arc.r)} 0 ${large} ${sweepFlag} ${fmt(x1)} ${fmt(y1)}`
}

export function fibSpiralPath(squares: FibSquare[]): string {
  const arcs = fibArcs(squares)
  if (arcs.length === 0) return ''
  return arcs
    .map((arc, i) => {
      const p = arcPath(arc)
      if (i === 0) return p
      return p.replace(/^M [^A]+A/, 'A')
    })
    .join(' ')
}

/**
 * True golden logarithmic spiral: r(θ) = a · exp((2 ln φ / π) · θ)
 * — radius ×φ every quarter turn.
 */
export function goldenLogSpiral(
  turns: number,
  a: number,
  samplesPerTurn = 96,
  clockwise = true,
  center: Pt = { x: 0, y: 0 },
  phase = -Math.PI / 2,
): Pt[] {
  const total = Math.max(1, Math.floor(turns * samplesPerTurn))
  const maxTheta = turns * 2 * Math.PI
  const pts: Pt[] = []
  const b = (2 * Math.log(PHI)) / Math.PI
  for (let i = 0; i <= total; i++) {
    const t = (i / total) * maxTheta
    const theta = (clockwise ? t : -t) + phase
    const r = a * Math.exp(b * Math.abs(t))
    pts.push({
      x: center.x + r * Math.cos(theta),
      y: center.y + r * Math.sin(theta),
    })
  }
  return pts
}

export function polylinePath(pts: Pt[]): string {
  if (pts.length === 0) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fmt(p.x)} ${fmt(p.y)}`).join(' ')
}

export function boundsOfSquares(squares: FibSquare[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of squares) {
    minX = Math.min(minX, s.x)
    minY = Math.min(minY, s.y)
    maxX = Math.max(maxX, s.x + s.size)
    maxY = Math.max(maxY, s.y + s.size)
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  return { minX, minY, maxX, maxY }
}

export function boundsOfPoints(pts: Pt[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  return { minX, minY, maxX, maxY }
}

export function mergeBounds(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
) {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

export function fmt(n: number): string {
  return (Math.round(n * 10000) / 10000).toString()
}

export function downloadSvg(filename: string, svg: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function normalizeSquares(squares: FibSquare[], fit = 400): FibSquare[] {
  if (squares.length === 0) return squares
  const b = boundsOfSquares(squares)
  const dim = Math.max(b.maxX - b.minX, b.maxY - b.minY, 1)
  const s = fit / dim
  return squares.map((sq) => ({
    ...sq,
    x: (sq.x - b.minX) * s,
    y: (sq.y - b.minY) * s,
    size: sq.size * s,
  }))
}

/** Pivot of the first arc — natural origin for overlaying a log spiral. */
export function spiralOrigin(squares: FibSquare[]): Pt {
  if (squares.length === 0) return { x: 0, y: 0 }
  const a = fibArcs(squares)[0]
  return { x: a.cx, y: a.cy }
}
