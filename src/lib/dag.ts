/** Directed acyclic graph model, cycle checks, and layered layout. */

export type DagNode = {
  id: string
  label: string
  x: number
  y: number
  status?: 'todo' | 'doing' | 'done'
}

export type DagEdge = {
  id: string
  from: string
  to: string
}

export type DagGraph = {
  nodes: DagNode[]
  edges: DagEdge[]
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function emptyGraph(): DagGraph {
  return { nodes: [], edges: [] }
}

/** Sample planning graph for first paint. */
export function sampleGraph(): DagGraph {
  const nodes: DagNode[] = [
    { id: 'n_vision', label: 'Vision', x: 0, y: 0, status: 'done' },
    { id: 'n_reqs', label: 'Requirements', x: 0, y: 0, status: 'done' },
    { id: 'n_arch', label: 'Architecture', x: 0, y: 0, status: 'doing' },
    { id: 'n_data', label: 'Data model', x: 0, y: 0, status: 'todo' },
    { id: 'n_api', label: 'API surface', x: 0, y: 0, status: 'todo' },
    { id: 'n_ui', label: 'UI shell', x: 0, y: 0, status: 'todo' },
    { id: 'n_auth', label: 'Auth', x: 0, y: 0, status: 'todo' },
    { id: 'n_deploy', label: 'Deploy', x: 0, y: 0, status: 'todo' },
  ]
  const edges: DagEdge[] = [
    { id: 'e1', from: 'n_vision', to: 'n_reqs' },
    { id: 'e2', from: 'n_reqs', to: 'n_arch' },
    { id: 'e3', from: 'n_arch', to: 'n_data' },
    { id: 'e4', from: 'n_arch', to: 'n_api' },
    { id: 'e5', from: 'n_arch', to: 'n_ui' },
    { id: 'e6', from: 'n_api', to: 'n_auth' },
    { id: 'e7', from: 'n_data', to: 'n_auth' },
    { id: 'e8', from: 'n_ui', to: 'n_deploy' },
    { id: 'e9', from: 'n_auth', to: 'n_deploy' },
  ]
  return layoutGraph({ nodes, edges })
}

export function adjacency(graph: DagGraph): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const n of graph.nodes) map.set(n.id, [])
  for (const e of graph.edges) {
    const list = map.get(e.from)
    if (list) list.push(e.to)
  }
  return map
}

export function reverseAdjacency(graph: DagGraph): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const n of graph.nodes) map.set(n.id, [])
  for (const e of graph.edges) {
    const list = map.get(e.to)
    if (list) list.push(e.from)
  }
  return map
}

/** True if adding from→to would create a cycle. */
export function wouldCreateCycle(graph: DagGraph, from: string, to: string): boolean {
  if (from === to) return true
  if (graph.edges.some((e) => e.from === from && e.to === to)) return true
  // Can we already reach `from` starting from `to`?
  const adj = adjacency(graph)
  const stack = [to]
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === from) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    for (const n of adj.get(cur) ?? []) stack.push(n)
  }
  return false
}

export function topologicalOrder(graph: DagGraph): string[] | null {
  const indeg = new Map<string, number>()
  for (const n of graph.nodes) indeg.set(n.id, 0)
  for (const e of graph.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)

  const queue = graph.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id)
  const order: string[] = []
  const adj = adjacency(graph)

  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adj.get(id) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1
      indeg.set(next, d)
      if (d === 0) queue.push(next)
    }
  }

  return order.length === graph.nodes.length ? order : null
}

/** Longest-path layer index from roots (for Sugiyama-style layout). */
export function assignLayers(graph: DagGraph): Map<string, number> {
  const layers = new Map<string, number>()
  const order = topologicalOrder(graph)
  if (!order) {
    graph.nodes.forEach((n, i) => layers.set(n.id, i))
    return layers
  }
  const rev = reverseAdjacency(graph)
  for (const id of order) {
    const preds = rev.get(id) ?? []
    if (preds.length === 0) layers.set(id, 0)
    else layers.set(id, Math.max(...preds.map((p) => layers.get(p) ?? 0)) + 1)
  }
  return layers
}

export type LayoutOptions = {
  rankGap?: number
  nodeGap?: number
  padding?: number
  /** horizontal = ranks left→right; vertical = ranks top→bottom */
  direction?: 'horizontal' | 'vertical'
}

export function layoutGraph(graph: DagGraph, opts: LayoutOptions = {}): DagGraph {
  const rankGap = opts.rankGap ?? 160
  const nodeGap = opts.nodeGap ?? 72
  const padding = opts.padding ?? 40
  const direction = opts.direction ?? 'horizontal'

  const layers = assignLayers(graph)
  const byLayer = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    const list = byLayer.get(layer) ?? []
    list.push(id)
    byLayer.set(layer, list)
  }

  // Order within layer: barycenter heuristic using predecessor positions
  const maxLayer = Math.max(0, ...byLayer.keys())
  const positions = new Map<string, number>()
  const rev = reverseAdjacency(graph)

  for (let L = 0; L <= maxLayer; L++) {
    const ids = byLayer.get(L) ?? []
    ids.sort((a, b) => {
      const pa = rev.get(a) ?? []
      const pb = rev.get(b) ?? []
      const ba = pa.length ? pa.reduce((s, p) => s + (positions.get(p) ?? 0), 0) / pa.length : 0
      const bb = pb.length ? pb.reduce((s, p) => s + (positions.get(p) ?? 0), 0) / pb.length : 0
      return ba - bb || a.localeCompare(b)
    })
    ids.forEach((id, i) => positions.set(id, i))
    byLayer.set(L, ids)
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const nodes: DagNode[] = []

  for (let L = 0; L <= maxLayer; L++) {
    const ids = byLayer.get(L) ?? []
    const count = ids.length
    ids.forEach((id, i) => {
      const n = nodeMap.get(id)!
      const cross = (i - (count - 1) / 2) * nodeGap
      if (direction === 'horizontal') {
        nodes.push({ ...n, x: padding + L * rankGap, y: padding + 200 + cross })
      } else {
        nodes.push({ ...n, x: padding + 200 + cross, y: padding + L * rankGap })
      }
    })
  }

  return { nodes, edges: graph.edges }
}

export function ancestors(graph: DagGraph, id: string): Set<string> {
  const rev = reverseAdjacency(graph)
  const out = new Set<string>()
  const stack = [...(rev.get(id) ?? [])]
  while (stack.length) {
    const cur = stack.pop()!
    if (out.has(cur)) continue
    out.add(cur)
    for (const p of rev.get(cur) ?? []) stack.push(p)
  }
  return out
}

export function descendants(graph: DagGraph, id: string): Set<string> {
  const adj = adjacency(graph)
  const out = new Set<string>()
  const stack = [...(adj.get(id) ?? [])]
  while (stack.length) {
    const cur = stack.pop()!
    if (out.has(cur)) continue
    out.add(cur)
    for (const n of adj.get(cur) ?? []) stack.push(n)
  }
  return out
}

export function graphBounds(
  graph: DagGraph,
  nodeW: number,
  nodeH: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (graph.nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 300 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.x - nodeW / 2)
    minY = Math.min(minY, n.y - nodeH / 2)
    maxX = Math.max(maxX, n.x + nodeW / 2)
    maxY = Math.max(maxY, n.y + nodeH / 2)
  }
  return { minX, minY, maxX, maxY }
}

export function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  nodeW: number,
  nodeH: number,
  direction: 'horizontal' | 'vertical',
): string {
  if (direction === 'horizontal') {
    const x1 = from.x + nodeW / 2
    const y1 = from.y
    const x2 = to.x - nodeW / 2
    const y2 = to.y
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }
  const x1 = from.x
  const y1 = from.y + nodeH / 2
  const x2 = to.x
  const y2 = to.y - nodeH / 2
  const my = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function serializeGraph(graph: DagGraph): string {
  return JSON.stringify(graph, null, 2)
}

export function parseGraph(json: string): DagGraph | null {
  try {
    const data = JSON.parse(json) as DagGraph
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null
    return data
  } catch {
    return null
  }
}

export const STATUS_COLOR: Record<NonNullable<DagNode['status']>, string> = {
  todo: '#7a7499',
  doing: '#c9993a',
  done: '#4ade80',
}
