/** Sacred geometry primitives — circle centers, chords, and SVG layer builders. */

export type Pt = { x: number; y: number }

export type GeometryLayer = {
  id: string
  label: string
  /** SVG markup for this layer (no wrapping <g>) */
  markup: string
}

export type PatternId =
  | 'vesica'
  | 'seed'
  | 'flower'
  | 'fruit'
  | 'metatron'
  | 'hexagram'
  | 'egg'

export type PatternMeta = {
  id: PatternId
  name: string
  blurb: string
  /** Whether ring count applies */
  rings?: boolean
  maxRings?: number
  defaultRings?: number
}

export const PATTERNS: PatternMeta[] = [
  {
    id: 'vesica',
    name: 'Vesica Piscis',
    blurb: 'Two overlapping circles — the vesica, root of proportion.',
  },
  {
    id: 'seed',
    name: 'Seed of Life',
    blurb: 'Seven circles: the genesis pattern within the Flower.',
  },
  {
    id: 'flower',
    name: 'Flower of Life',
    blurb: 'Hexagonal lattice of equal circles. Adjustable ring depth.',
    rings: true,
    maxRings: 5,
    defaultRings: 2,
  },
  {
    id: 'fruit',
    name: 'Fruit of Life',
    blurb: 'Thirteen circle centers extracted from the Flower.',
  },
  {
    id: 'metatron',
    name: "Metatron's Cube",
    blurb: 'Fruit of Life with every center connected — platonic scaffolding.',
  },
  {
    id: 'hexagram',
    name: 'Hexagram',
    blurb: 'Interlocking equilateral triangles within the bounding circle.',
  },
  {
    id: 'egg',
    name: 'Egg of Life',
    blurb: 'Eight spheres of the first cellular mitosis — isometric projection.',
  },
]

const DEG = Math.PI / 180

function key(p: Pt, precision = 1000): string {
  return `${Math.round(p.x * precision)},${Math.round(p.y * precision)}`
}

function hexRing(center: Pt, r: number): Pt[] {
  return [0, 60, 120, 180, 240, 300].map((a) => ({
    x: center.x + r * Math.cos(a * DEG),
    y: center.y + r * Math.sin(a * DEG),
  }))
}

/** Circle centers for Flower of Life with `rings` hexagonal shells around the origin. */
export function flowerCenters(rings: number, radius: number): Pt[] {
  const map = new Map<string, Pt>()
  const add = (p: Pt) => {
    const k = key(p)
    if (!map.has(k)) map.set(k, p)
  }

  add({ x: 0, y: 0 })
  let frontier: Pt[] = [{ x: 0, y: 0 }]

  for (let i = 0; i < rings; i++) {
    const next: Pt[] = []
    for (const c of frontier) {
      for (const n of hexRing(c, radius)) {
        const k = key(n)
        if (!map.has(k)) {
          map.set(k, n)
          next.push(n)
        }
      }
    }
    frontier = next
  }

  return [...map.values()]
}

/** Fruit of Life: origin + first hex ring + second ring at 2R. */
export function fruitCenters(radius: number): Pt[] {
  const centers: Pt[] = [{ x: 0, y: 0 }]
  centers.push(...hexRing({ x: 0, y: 0 }, radius))
  centers.push(...hexRing({ x: 0, y: 0 }, radius * 2))
  return centers
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString()
}

function circleEl(c: Pt, r: number, attrs = ''): string {
  return `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" ${attrs}/>`
}

function lineEl(a: Pt, b: Pt, attrs = ''): string {
  return `<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" ${attrs}/>`
}

function polygonEl(pts: Pt[], attrs = ''): string {
  const points = pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ')
  return `<polygon points="${points}" ${attrs}/>`
}

function allChords(centers: Pt[]): Array<[Pt, Pt]> {
  const edges: Array<[Pt, Pt]> = []
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      edges.push([centers[i], centers[j]])
    }
  }
  return edges
}

export type BuildOptions = {
  pattern: PatternId
  /** Circle radius in viewBox units */
  radius: number
  rings: number
  stroke: string
  accent: string
  strokeWidth: number
  showCenters: boolean
  showBounding: boolean
}

export type BuiltGeometry = {
  layers: GeometryLayer[]
  /** Suggested viewBox half-extent (content fits in [-extent, extent]) */
  extent: number
}

export function buildGeometry(opts: BuildOptions): BuiltGeometry {
  const { pattern, radius: r, rings, stroke, accent, strokeWidth, showCenters, showBounding } = opts
  const sw = `stroke="${stroke}" stroke-width="${strokeWidth}" fill="none"`
  const swAccent = `stroke="${accent}" stroke-width="${strokeWidth * 1.15}" fill="none"`
  const layers: GeometryLayer[] = []

  let extent = r * 2.2

  if (pattern === 'vesica') {
    const a = { x: -r / 2, y: 0 }
    const b = { x: r / 2, y: 0 }
    layers.push({
      id: 'circles',
      label: 'Circles',
      markup: [circleEl(a, r, sw), circleEl(b, r, sw)].join('\n'),
    })
    // Vesica almond: intersection of both circles (lens)
    const h = (Math.sqrt(3) / 2) * r
    const lens = [
      `M 0 ${fmt(-h)}`,
      `A ${fmt(r)} ${fmt(r)} 0 0 1 0 ${fmt(h)}`,
      `A ${fmt(r)} ${fmt(r)} 0 0 1 0 ${fmt(-h)}`,
      'Z',
    ].join(' ')
    layers.push({
      id: 'vesica-lens',
      label: 'Lens',
      markup: `<path d="${lens}" ${swAccent} fill="${accent}" fill-opacity="0.08"/>\n${lineEl({ x: 0, y: -h }, { x: 0, y: h }, swAccent)}`,
    })
    extent = r * 1.6
  } else if (pattern === 'seed') {
    const centers = flowerCenters(1, r)
    layers.push({
      id: 'circles',
      label: 'Circles',
      markup: centers.map((c) => circleEl(c, r, sw)).join('\n'),
    })
    extent = r * 2.2
  } else if (pattern === 'flower') {
    const centers = flowerCenters(rings, r)
    layers.push({
      id: 'circles',
      label: 'Circles',
      markup: centers.map((c) => circleEl(c, r, sw)).join('\n'),
    })
    extent = r * (rings + 1.15)
  } else if (pattern === 'fruit') {
    const centers = fruitCenters(r)
    layers.push({
      id: 'circles',
      label: 'Circles',
      markup: centers.map((c) => circleEl(c, r, sw)).join('\n'),
    })
    extent = r * 3.2
  } else if (pattern === 'metatron') {
    const centers = fruitCenters(r)
    layers.push({
      id: 'circles',
      label: 'Circles',
      markup: centers.map((c) => circleEl(c, r * 0.22, `${sw} opacity="0.55"`)).join('\n'),
    })
    layers.push({
      id: 'chords',
      label: 'Chords',
      markup: allChords(centers)
        .map(([a, b]) => lineEl(a, b, `${sw} opacity="0.85"`))
        .join('\n'),
    })
    // Outer hexagon hint
    const outer = hexRing({ x: 0, y: 0 }, r * 2)
    layers.push({
      id: 'hexagon',
      label: 'Outer Hexagon',
      markup: polygonEl(outer, `${swAccent} opacity="0.5"`),
    })
    extent = r * 2.4
  } else if (pattern === 'hexagram') {
    const up = [0, 120, 240].map((a) => ({
      x: r * Math.cos((a - 90) * DEG),
      y: r * Math.sin((a - 90) * DEG),
    }))
    const down = [0, 120, 240].map((a) => ({
      x: r * Math.cos((a + 90) * DEG),
      y: r * Math.sin((a + 90) * DEG),
    }))
    layers.push({
      id: 'bounding',
      label: 'Bounding Circle',
      markup: circleEl({ x: 0, y: 0 }, r, sw),
    })
    layers.push({
      id: 'triangle-up',
      label: 'Triangle ↑',
      markup: polygonEl(up, swAccent),
    })
    layers.push({
      id: 'triangle-down',
      label: 'Triangle ↓',
      markup: polygonEl(down, sw),
    })
    extent = r * 1.25
  } else if (pattern === 'egg') {
    // Isometric-ish cluster of 8 circle centers (cube vertices projected)
    const s = r * 0.85
    const centers: Pt[] = [
      { x: 0, y: -s * 0.9 },
      { x: s * 0.78, y: -s * 0.35 },
      { x: -s * 0.78, y: -s * 0.35 },
      { x: 0, y: s * 0.15 },
      { x: s * 0.78, y: s * 0.55 },
      { x: -s * 0.78, y: s * 0.55 },
      { x: 0, y: s * 1.05 },
      { x: 0, y: -s * 0.15 },
    ]
    layers.push({
      id: 'circles',
      label: 'Spheres',
      markup: centers.map((c) => circleEl(c, r * 0.55, sw)).join('\n'),
    })
    extent = r * 2.1
  }

  if (showBounding && pattern !== 'hexagram') {
    layers.unshift({
      id: 'field',
      label: 'Field Circle',
      markup: circleEl({ x: 0, y: 0 }, extent * 0.92, `${swAccent} opacity="0.35"`),
    })
  }

  if (showCenters) {
    let pts: Pt[] = []
    if (pattern === 'vesica') pts = [{ x: -r / 2, y: 0 }, { x: r / 2, y: 0 }]
    else if (pattern === 'seed') pts = flowerCenters(1, r)
    else if (pattern === 'flower') pts = flowerCenters(rings, r)
    else if (pattern === 'fruit' || pattern === 'metatron') pts = fruitCenters(r)
    else if (pattern === 'hexagram') pts = [{ x: 0, y: 0 }]
    else if (pattern === 'egg') {
      const s = r * 0.85
      pts = [
        { x: 0, y: -s * 0.9 },
        { x: s * 0.78, y: -s * 0.35 },
        { x: -s * 0.78, y: -s * 0.35 },
        { x: 0, y: s * 0.15 },
        { x: s * 0.78, y: s * 0.55 },
        { x: -s * 0.78, y: s * 0.55 },
        { x: 0, y: s * 1.05 },
        { x: 0, y: -s * 0.15 },
      ]
    }

    layers.push({
      id: 'centers',
      label: 'Centers',
      markup: pts
        .map((c) => `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(strokeWidth * 1.8)}" fill="${accent}" stroke="none"/>`)
        .join('\n'),
    })
  }

  return { layers, extent: Math.max(extent, r * 1.2) }
}

export function layersToSvg(
  layers: GeometryLayer[],
  visible: Set<string>,
  extent: number,
  opts: { background?: string; title?: string },
): string {
  const pad = extent * 1.08
  const size = pad * 2
  const groups = layers
    .filter((l) => visible.has(l.id))
    .map(
      (l) =>
        `  <g id="${l.id}" inkscape:groupmode="layer" inkscape:label="${escapeXml(l.label)}">\n${indent(l.markup, 4)}\n  </g>`,
    )
    .join('\n')

  const bg = opts.background
    ? `  <rect x="${fmt(-pad)}" y="${fmt(-pad)}" width="${fmt(size)}" height="${fmt(size)}" fill="${opts.background}"/>\n`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  width="${fmt(size)}" height="${fmt(size)}" viewBox="${fmt(-pad)} ${fmt(-pad)} ${fmt(size)} ${fmt(size)}"
  role="img"${opts.title ? ` aria-label="${escapeXml(opts.title)}"` : ''}>
${opts.title ? `  <title>${escapeXml(opts.title)}</title>\n` : ''}${bg}${groups}
</svg>
`
}

function indent(s: string, n: number): string {
  const pad = ' '.repeat(n)
  return s
    .split('\n')
    .filter(Boolean)
    .map((line) => pad + line)
    .join('\n')
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
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
