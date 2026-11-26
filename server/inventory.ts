import { tailnetFetch } from './tailnet.js'

/**
 * Live inventory for the portal's Websites / Web Apps / Hosted services page.
 * Source: Directus `inventory`, `domains`, `sites`, `sites_inventory` (GET only).
 * The token is read from DIRECTUS_INVENTORY_TOKEN on the server and never sent to the browser.
 */

const DIRECTUS_URL = (process.env.DIRECTUS_URL || 'https://cp.tiger-bushmaster.ts.net').replace(/\/$/, '')
const CACHE_TTL_MS = 5 * 60 * 1000
const FAILURE_RETRY_MS = 30 * 1000
const VIBRAS_PARENT = 'vibras-sagradas.com'

/** The six websites. `inventoryName` is the inventory row name (before any ":main-..." suffix) that is the site. */
const WEBSITES: { domain: string; label: string; inventoryName: string | null }[] = [
  { domain: 'casa-elixir.com', label: 'Elixir', inventoryName: 'elixir' },
  { domain: 'bluestarperuvianexports.eu', label: 'Blue Star', inventoryName: 'bluestar-app' },
  { domain: 'brisasdelmarlurin.com', label: 'Brisas del Mar', inventoryName: null },
  { domain: 'immigration-peru.com', label: 'Immigration Peru', inventoryName: 'immigration-peru.com' },
  { domain: 'vibras-sagradas.com', label: 'Vibras Sagradas', inventoryName: 'vibras-sagradas-home' },
  { domain: 'sg-labs.xyz', label: 'SG Labs', inventoryName: 'SG Labs Homepage' },
]

export type InventoryItem = {
  title: string
  group: string
  status: string | null
  host: string | null
  href: string | null
}

export type InventorySnapshot = {
  ok: boolean
  stale: boolean
  fetchedAt: string | null
  error: string | null
  sections: {
    websites: InventoryItem[]
    webApps: InventoryItem[]
    hostedServices: InventoryItem[]
  }
  excludedTailnetDevices: number
}

type InvRow = {
  id: string
  name: string
  url: string | null
  category: string
  group: string | null
  display_name: string | null
  status: string | null
}

type Cached = { at: number; ttl: number; snapshot: InventorySnapshot }

let cache: Cached | null = null
let lastGood: InventorySnapshot | null = null
let inflight: Promise<InventorySnapshot> | null = null

/** Strip Coolify's ":main-<id>" tag and trailing random ids from a name, for display only. */
function cleanName(name: string): string {
  return name.replace(/:main-.*$/, '').replace(/-[a-z0-9]{20,}$/, '')
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Public link for a row. Coolify's sslip.io defaults embed a server IP, so they are not shown. */
function publicLink(url: string | null | undefined): { href: string | null; host: string | null } {
  if (!url) return { href: null, host: null }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { href: null, host: null }
  }
  if (parsed.hostname.endsWith('sslip.io')) return { href: null, host: null }
  const href = `https://${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`
  return { href, host: parsed.host }
}

function toItem(row: InvRow, title?: string): InventoryItem {
  const link = publicLink(row.url)
  return {
    title: title || row.display_name || cleanName(row.name),
    group: row.group || 'Uncategorised',
    status: row.status,
    host: link.host,
    href: link.href,
  }
}

async function directus<T>(token: string, path: string, params: Record<string, string>): Promise<T[]> {
  const qs = new URLSearchParams({ limit: '-1', ...params })
  const res = await tailnetFetch(`${DIRECTUS_URL}/items/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Directus ${path} returned HTTP ${res.status}`)
  const body = (await res.json()) as { data?: T[] }
  return body.data ?? []
}

/** Pure classification: exported for tests. */
export function classifyInventory(
  rows: InvRow[],
  domains: { name: string; status: string | null }[],
): Omit<InventorySnapshot, 'ok' | 'stale' | 'fetchedAt' | 'error'> {
  const used = new Set<InvRow>()
  const websites: InventoryItem[] = []

  for (const site of WEBSITES) {
    const domainRow = domains.find((d) => d.name === site.domain)
    const row = site.inventoryName
      ? rows.find((r) => r.name.replace(/:main-.*$/, '') === site.inventoryName)
      : undefined
    if (row) {
      used.add(row)
      websites.push({ ...toItem(row, site.label), host: site.domain, href: `https://${site.domain}` })
    } else {
      websites.push({
        title: site.label,
        group: 'Uncategorised',
        status: domainRow?.status ?? null,
        host: site.domain,
        href: `https://${site.domain}`,
      })
    }
  }

  const webApps: InventoryItem[] = []
  for (const row of rows) {
    if (used.has(row)) continue
    // Every Vibras app is a web app: its URL is a vibras-sagradas.com subdomain, or its inventory name starts with "vibras-".
    const host = hostOf(row.url)
    const isVibrasApp = (host && host.endsWith(`.${VIBRAS_PARENT}`)) || row.name.startsWith('vibras-')
    if (isVibrasApp && (row.category === 'coolify-application' || row.category === 'coolify-service' || (host && host.endsWith(`.${VIBRAS_PARENT}`)))) {
      used.add(row)
      webApps.push(toItem(row))
    }
  }

  const hostedServices: InventoryItem[] = []
  for (const row of rows) {
    if (used.has(row)) continue
    if (row.category === 'coolify-application' || row.category === 'coolify-service') {
      hostedServices.push(toItem(row))
    }
  }

  const excludedTailnetDevices = rows.filter((r) => r.category === 'tailscale-device').length

  return { sections: { websites, webApps, hostedServices }, excludedTailnetDevices }
}

async function buildSnapshot(): Promise<InventorySnapshot> {
  const token = process.env.DIRECTUS_INVENTORY_TOKEN
  if (!token) throw new Error('DIRECTUS_INVENTORY_TOKEN is not set on the server')

  const [rows, domains] = await Promise.all([
    directus<InvRow>(token, 'inventory', {
      fields: 'id,name,url,category,group,display_name,status',
    }),
    directus<{ name: string; status: string | null }>(token, 'domains', { fields: 'name,status' }),
  ])

  return {
    ok: true,
    stale: false,
    fetchedAt: new Date().toISOString(),
    error: null,
    ...classifyInventory(rows, domains),
  }
}

/** Returns a cached snapshot (5 min), or the last good snapshot marked stale if Directus is down. */
export function getInventorySnapshot(): Promise<InventorySnapshot> {
  if (cache && Date.now() - cache.at < cache.ttl) return Promise.resolve(cache.snapshot)
  if (inflight) return inflight

  inflight = buildSnapshot()
    .then((snapshot) => {
      lastGood = snapshot
      cache = { at: Date.now(), ttl: CACHE_TTL_MS, snapshot }
      return snapshot
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'unknown error'
      console.error(`[openclaw-portal] inventory: ${message}`)
      const failed: InventorySnapshot = lastGood
        ? { ...lastGood, ok: false, stale: true, error: 'Inventory data is unavailable; showing the last successful snapshot.' }
        : {
            ok: false,
            stale: false,
            fetchedAt: null,
            error: 'Inventory data is unavailable.',
            sections: { websites: [], webApps: [], hostedServices: [] },
            excludedTailnetDevices: 0,
          }
      cache = { at: Date.now(), ttl: FAILURE_RETRY_MS, snapshot: failed }
      return failed
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
