export type AppKind = 'native' | 'iframe' | 'link'

export type AppDef = {
  id: string
  label: string
  description: string
  kind: AppKind
  /** Env var that holds the live URL for iframe/link apps */
  envKey?: string
  /** Native React view id when kind === 'native' */
  view?: 'prompt-generator' | 'blog-generator' | 'home' | 'tools' | 'sacred-geometry' | 'hex-lattice' | 'fibonacci-spiral' | 'dag-planner' | 'solfeggio-visualizer' | 'knowledge' | 'blog'
}

export const APP_REGISTRY: AppDef[] = [
  {
    id: 'prompt-generator',
    label: 'Prompt Generator',
    description: 'Create and refine prompts; publish to Quartz / Docmost.',
    kind: 'native',
    view: 'prompt-generator',
  },
  {
    id: 'blog-generator',
    label: 'Blog Generator',
    description: 'Draft posts and push into the living archive.',
    kind: 'native',
    view: 'blog-generator',
  },
  {
    id: 'tools',
    label: 'Tools',
    description: 'Sacred geometry and computation instruments.',
    kind: 'native',
    view: 'tools',
  },
  {
    id: 'sacred-geometry',
    label: 'Geometry',
    description: 'Sacred Geometry Builder — Flower of Life, Metatron, SVG export.',
    kind: 'native',
    view: 'sacred-geometry',
  },
  {
    id: 'hex-lattice',
    label: 'Hex Lattice',
    description: 'Hex Lattice Explorer — tessellation, paint, topology.',
    kind: 'native',
    view: 'hex-lattice',
  },
  {
    id: 'fibonacci-spiral',
    label: 'Fibonacci',
    description: 'Fibonacci Spiral — golden ratio curves and rectangles.',
    kind: 'native',
    view: 'fibonacci-spiral',
  },
  {
    id: 'dag-planner',
    label: 'DAG',
    description: 'DAG Planner — dependency maps and system plans.',
    kind: 'native',
    view: 'dag-planner',
  },
  {
    id: 'solfeggio-visualizer',
    label: 'Solfeggio',
    description: 'Solfeggio Frequency Visualizer — 9 sacred tones & digital roots.',
    kind: 'native',
    view: 'solfeggio-visualizer',
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    description: 'In-app knowledge base.',
    kind: 'native',
    view: 'knowledge',
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Writings archive rendered in React.',
    kind: 'native',
    view: 'blog',
  },
  {
    id: 'docmost',
    label: 'Docmost',
    description: 'Team wiki — collaborative docs.',
    kind: 'iframe',
    envKey: 'DOCMOST_URL',
  },
  {
    id: 'quartz',
    label: 'Quartz',
    description: 'Markdown knowledge garden.',
    kind: 'iframe',
    envKey: 'QUARTZ_URL',
  },
  {
    id: 'silverbullet',
    label: 'SilverBullet',
    description: 'Personal knowledge OS.',
    kind: 'iframe',
    envKey: 'SILVERBULLET_URL',
  },
]

const DEFAULTS: Record<string, string> = {
  DOCMOST_URL: 'https://docmost.tiger-bushmaster.ts.net',
  QUARTZ_URL: 'https://quartz.tiger-bushmaster.ts.net',
  SILVERBULLET_URL: 'https://silverbullet.tiger-bushmaster.ts.net',
}

export function resolveAppUrl(appId: string): string | undefined {
  const def = APP_REGISTRY.find((a) => a.id === appId)
  if (!def?.envKey) return undefined
  return process.env[def.envKey] || DEFAULTS[def.envKey]
}
