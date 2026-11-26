import { useEffect, useState } from 'react'
import type { InventoryItem } from '../../server/inventory'

type Snapshot = {
  ok: boolean
  stale: boolean
  fetchedAt: string | null
  error: string | null
  sections: { websites: InventoryItem[]; webApps: InventoryItem[]; hostedServices: InventoryItem[] }
}

const SECTIONS: { key: keyof Snapshot['sections']; title: string }[] = [
  { key: 'websites', title: 'Websites' },
  { key: 'webApps', title: 'Web Apps' },
  { key: 'hostedServices', title: 'Hosted services' },
]

function statusClass(status: string | null): string {
  if (!status) return 'bg-muted text-muted-foreground'
  if (/^(running|online|live|active)/.test(status) && !/unhealthy|degraded/.test(status))
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  if (/^(exited|offline)/.test(status)) return 'bg-muted text-muted-foreground'
  return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
}

function groupItems(items: InventoryItem[]): [string, InventoryItem[]][] {
  const map = new Map<string, InventoryItem[]>()
  for (const item of items) {
    const list = map.get(item.group) ?? []
    list.push(item)
    map.set(item.group, list)
  }
  const groups = [...map.entries()].sort(([a], [b]) => {
    if (a === 'Uncategorised') return 1
    if (b === 'Uncategorised') return -1
    return a.localeCompare(b)
  })
  for (const [, list] of groups) list.sort((a, b) => a.title.localeCompare(b.title))
  return groups
}

function ItemCard({ item }: { item: InventoryItem }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium text-foreground">{item.title}</div>
        {item.href ? (
          <a href={item.href} className="block break-all text-sm text-primary underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
            {item.host}
          </a>
        ) : (
          <div className="text-sm text-muted-foreground">No public URL</div>
        )}
      </div>
      {item.status && (
        <span className={`mt-1 inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-xs sm:mt-0 ${statusClass(item.status)}`}>
          {item.status.replace(':', ' · ')}
        </span>
      )}
    </li>
  )
}

export default function Inventory() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/inventory')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Snapshot) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  const hasItems = data ? SECTIONS.some((s) => data.sections[s.key].length > 0) : false

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-4 py-6 text-foreground">
      <h1 className="text-2xl font-semibold">Websites and services</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live from the inventory. Tailnet-only page.</p>

      {!data && !failed && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

      {(failed || (data && !data.ok)) && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Data unavailable</p>
          <p className="text-muted-foreground">
            {failed ? 'The portal could not load the inventory.' : data?.error}
            {data?.fetchedAt && ` Last successful update: ${new Date(data.fetchedAt).toLocaleString()}.`}
          </p>
        </div>
      )}

      {data && (data.ok || hasItems) &&
        SECTIONS.map((section) => {
          const items = data.sections[section.key]
          return (
            <section key={section.key} className="mt-8">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None yet</p>
              ) : (
                groupItems(items).map(([group, list]) => (
                  <div key={group} className="mt-3">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group}</h3>
                    <ul className="flex flex-col gap-2">
                      {list.map((item, i) => (
                        <ItemCard key={`${item.title}-${i}`} item={item} />
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          )
        })}
    </main>
  )
}
