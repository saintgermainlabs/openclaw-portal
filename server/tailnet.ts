/**
 * Ensure Tailnet destinations are not forced through HTTP(S)_PROXY.
 * Cursor/sandbox proxies break MagicDNS / 100.x connectivity.
 */
export function ensureTailnetNoProxy() {
  const extras = [
    '.ts.net',
    'ts.net',
    '.tiger-bushmaster.ts.net',
    'tiger-bushmaster.ts.net',
    '100.64.0.0/10',
    'localhost',
    '127.0.0.1',
    '::1',
  ]

  for (const key of ['NO_PROXY', 'no_proxy'] as const) {
    const cur = process.env[key] || ''
    const parts = new Set(
      cur
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    for (const e of extras) parts.add(e)
    process.env[key] = Array.from(parts).join(',')
  }
}

/** Fetch that never uses the ambient HTTP proxy (Tailnet-safe). */
export async function tailnetFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  ensureTailnetNoProxy()
  // Node 18+ undici: proxy from env — temporarily clear for this call
  const saved: Record<string, string | undefined> = {}
  for (const k of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
  ]) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
  try {
    return await fetch(input, init)
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}
