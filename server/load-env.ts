import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ensureTailnetNoProxy } from './tailnet.js'

/** Load `.env` into process.env without overriding existing vars. */
export function loadDotEnv(file = resolve(process.cwd(), '.env')) {
  if (!existsSync(file)) {
    console.warn('[openclaw-portal] no .env found — OpenClaw chat will stay in mock mode')
    console.warn('[openclaw-portal] run: ./scripts/sync-env-from-openclaw.sh')
    return { loaded: false as const, path: file }
  }
  const text = readFileSync(file, 'utf8')
  let count = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = val
      count++
    }
  }
  console.log(`[openclaw-portal] loaded ${count} vars from .env`)
  return { loaded: true as const, path: file, count }
}

// Side-effect: must run before other server modules read process.env
loadDotEnv()
ensureTailnetNoProxy()
console.log('[openclaw-portal] NO_PROXY includes .ts.net for Tailnet routing')
