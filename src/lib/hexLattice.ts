/** Hexagonal lattice math — axial coords, layouts, and SVG helpers. */

export type Hex = { q: number; r: number }

export type HexOrientation = 'pointy' | 'flat'

export type LatticeShape = 'hexagon' | 'rectangle' | 'ring'

export type CellData = {
  value: number
  label?: string
}

const SQRT3 = Math.sqrt(3)

export const AXIAL_DIRS: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`
}

export function parseHexKey(k: string): Hex {
  const [q, r] = k.split(',').map(Number)
  return { q, r }
}

export function hexAdd(a: Hex, b: Hex): Hex {
  return { q: a.q + b.q, r: a.r + b.r }
}

export function hexNeighbors(h: Hex): Hex[] {
  return AXIAL_DIRS.map((d) => hexAdd(h, d))
}

export function hexDistance(a: Hex, b: Hex): number {
  const as = -a.q - a.r
  const bs = -b.q - b.r
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(as - bs))
}

export function hexToPixel(h: Hex, size: number, orientation: HexOrientation): { x: number; y: number } {
  if (orientation === 'pointy') {
    return {
      x: size * (SQRT3 * h.q + (SQRT3 / 2) * h.r),
      y: size * ((3 / 2) * h.r),
    }
  }
  return {
    x: size * ((3 / 2) * h.q),
    y: size * ((SQRT3 / 2) * h.q + SQRT3 * h.r),
  }
}

export function pixelToHex(x: number, y: number, size: number, orientation: HexOrientation): Hex {
  let q: number
  let r: number
  if (orientation === 'pointy') {
    q = ((SQRT3 / 3) * x - (1 / 3) * y) / size
    r = ((2 / 3) * y) / size
  } else {
    q = ((2 / 3) * x) / size
    r = ((-1 / 3) * x + (SQRT3 / 3) * y) / size
  }
  return cubeRound(q, r, -q - r)
}

function cubeRound(fq: number, fr: number, fs: number): Hex {
  let q = Math.round(fq)
  let r = Math.round(fr)
  let s = Math.round(fs)
  const dq = Math.abs(q - fq)
  const dr = Math.abs(r - fr)
  const ds = Math.abs(s - fs)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q, r }
}

export function hexCorners(
  center: { x: number; y: number },
  size: number,
  orientation: HexOrientation,
): Array<{ x: number; y: number }> {
  const start = orientation === 'pointy' ? 30 : 0
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((start + i * 60) * Math.PI) / 180
    return {
      x: center.x + size * Math.cos(a),
      y: center.y + size * Math.sin(a),
    }
  })
}

export function polygonPoints(corners: Array<{ x: number; y: number }>): string {
  return corners.map((c) => `${fmt(c.x)},${fmt(c.y)}`).join(' ')
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString()
}

/** Cells in a large hexagon of given radius (0 = single cell). */
export function hexagonMap(radius: number): Hex[] {
  const cells: Hex[] = []
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius)
    const r2 = Math.min(radius, -q + radius)
    for (let r = r1; r <= r2; r++) cells.push({ q, r })
  }
  return cells
}

/** Offset rectangle (odd-r / odd-q style for nicer packing). */
export function rectangleMap(width: number, height: number, orientation: HexOrientation): Hex[] {
  const cells: Hex[] = []
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (orientation === 'pointy') {
        const q = col - Math.floor(row / 2)
        cells.push({ q, r: row })
      } else {
        const r = row - Math.floor(col / 2)
        cells.push({ q: col, r })
      }
    }
  }
  // center around origin
  const midQ = Math.floor(width / 2)
  const midR = Math.floor(height / 2)
  if (orientation === 'pointy') {
    const oq = midQ - Math.floor(midR / 2)
    return cells.map((c) => ({ q: c.q - oq, r: c.r - midR }))
  }
  const or_ = midR - Math.floor(midQ / 2)
  return cells.map((c) => ({ q: c.q - midQ, r: c.r - or_ }))
}

export function ringMap(radius: number): Hex[] {
  if (radius === 0) return [{ q: 0, r: 0 }]
  const cells: Hex[] = []
  let h: Hex = { q: radius, r: -radius }
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      cells.push(h)
      h = hexAdd(h, AXIAL_DIRS[i])
    }
  }
  return cells
}

export function generateLattice(
  shape: LatticeShape,
  radius: number,
  width: number,
  height: number,
  orientation: HexOrientation,
): Hex[] {
  switch (shape) {
    case 'hexagon':
      return hexagonMap(radius)
    case 'rectangle':
      return rectangleMap(width, height, orientation)
    case 'ring':
      return ringMap(radius)
    default:
      return hexagonMap(radius)
  }
}

/** Unique undirected edges between neighboring cells that both exist in the set. */
export function latticeEdges(cells: Hex[]): Array<[Hex, Hex]> {
  const set = new Set(cells.map(hexKey))
  const edges: Array<[Hex, Hex]> = []
  const seen = new Set<string>()
  for (const c of cells) {
    for (const n of hexNeighbors(c)) {
      const nk = hexKey(n)
      if (!set.has(nk)) continue
      const a = hexKey(c)
      const edgeKey = a < nk ? `${a}|${nk}` : `${nk}|${a}`
      if (seen.has(edgeKey)) continue
      seen.add(edgeKey)
      edges.push([c, n])
    }
  }
  return edges
}

/** BFS distance field from origin cell(s). */
export function distanceField(cells: Hex[], origins: Hex[]): Map<string, number> {
  const set = new Set(cells.map(hexKey))
  const dist = new Map<string, number>()
  const queue: Hex[] = []
  for (const o of origins) {
    const k = hexKey(o)
    if (!set.has(k)) continue
    dist.set(k, 0)
    queue.push(o)
  }
  let i = 0
  while (i < queue.length) {
    const cur = queue[i++]
    const d = dist.get(hexKey(cur))!
    for (const n of hexNeighbors(cur)) {
      const nk = hexKey(n)
      if (!set.has(nk) || dist.has(nk)) continue
      dist.set(nk, d + 1)
      queue.push(n)
    }
  }
  return dist
}

export function heatColor(t: number, low = '#1a1433', high = '#7c6dfa'): string {
  const clamped = Math.max(0, Math.min(1, t))
  const a = hexToRgb(low)
  const b = hexToRgb(high)
  const r = Math.round(a.r + (b.r - a.r) * clamped)
  const g = Math.round(a.g + (b.g - a.g) * clamped)
  const bl = Math.round(a.b + (b.b - a.b) * clamped)
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function boundsOf(
  cells: Hex[],
  size: number,
  orientation: HexOrientation,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const c of cells) {
    const p = hexToPixel(c, size, orientation)
    for (const corner of hexCorners(p, size, orientation)) {
      minX = Math.min(minX, corner.x)
      minY = Math.min(minY, corner.y)
      maxX = Math.max(maxX, corner.x)
      maxY = Math.max(maxY, corner.y)
    }
  }
  if (!Number.isFinite(minX)) return { minX: -1, minY: -1, maxX: 1, maxY: 1 }
  return { minX, minY, maxX, maxY }
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

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}
