## Learned User Preferences

- Prefer OpenRouter over direct OpenAI for LLM calls in n8n and similar automations.
- Stage knowledge and prompts in Docmost before any Supabase migration; Docmost is the preferred interim store.
- Use dedicated OpenClaw specialist agent profiles (workspace + stronger model) for prompt generation rather than the default generic agent.
- Portal UX should stay two-pane: left chat with OpenClaw, right pane for results and connected apps.
- For business/lead enrichment, keep task definitions in mission control; run Facebook → Tripadvisor → Instagram scrapes in sequence; stage JSON on a Docmost `scraped_data` page and keep images only temporarily under `data/scraped/{slug}/`.
- Website research workflows should scrape/crawl available pages first, then synthesize briefs (do not invent site content before the crawl).
- Keep portable workflow specs as YAML under `workflows/`; credentials stay in n8n, never in YAML.
- Prefer OpenRouter for embeddings; Reddit scrape runs should sample a modest batch (~50 posts) on staggered/unpredictable schedules (e.g. ~10:00 and ~20:00).
- Prefer Tailnet-reachable services and sidecars for portal ↔ OpenClaw and related app connectivity; for Compose apps use `ghcr.io/saintgermainlabs/tailscale-app-sidecar` with the app on `network_mode: service:tailscale`.
- Prefer continual learning / `AGENTS.md` for durable memory; do not set up or rely on mem0 yet.
- Avoid double-registering the same MCP servers in both Cursor plugins/`mcp.json` and MetaMCP (e.g. Context7, mem0); prefer MetaMCP aggregation and remove duplicate local registrations.

## Learned Workspace Facts

- This repo is the OpenClaw Portal: React two-pane UI with Vite HMR, Hono BFF, and a Tailscale Serve sidecar; public Tailnet host is `openclaw-portal.tiger-bushmaster.ts.net`.
- OpenClaw gateway is on the same Tailnet (`openclaw.tiger-bushmaster.ts.net`); connected apps include Docmost, Quartz, and SilverBullet.
- Prompt generation specialists live under `agents/prompt-engineer/` (and related agent workspaces); deploy helpers are in `scripts/`.
- n8n runs at `n8n.tiger-bushmaster.ts.net`; `n8n/workflows/prompt-generate` is Webhook → OpenRouter → Docmost Prompts space, with OpenRouter/Docmost credentials kept in n8n (not OpenClaw).
- Portable workflow catalog lives under `workflows/` (`prompt-generate`, `website-research`, `business-enrichment`); local scrape artifacts stage under `data/scraped/`.
- Coolify is the primary deploy/ops surface at `coolify.sg-labs.xyz` (Cloudflare Tunnel); BorgBackup covers files today, with Coolify Postgres the highest-priority DB backup target and a separate Medusa database also needing backup.
- Supabase has not been migrated to the remote server yet; treat Docmost as the staging layer until that move.
- Docmost’s Coolify stack includes Ollama and Postgres with pgvector; Docmost AI uses `AI_DRIVER=ollama` and should call the stack’s Ollama service hostname (bare `ollama` can resolve via Tailscale MagicDNS to the wrong instance).
- MetaMCP fronts aggregated MCP servers (including mem0) at `metamcp.tiger-bushmaster.ts.net`; Cursor uses `/metamcp/oc/mcp`, and n8n uses `/metamcp/openclaw/mcp` with an `X-API-Key` header.
- MetaMCP’s Coolify app container is statically named `metamcp-app`, memory-capped at 4GiB (PID limit 512), and restarted daily at 04:00 via host cron `/etc/cron.d/restart-metamcp` on the Coolify server to clear leaked stdio MCP child processes.
- Tailnet services commonly use `*.tiger-bushmaster.ts.net` hostnames; Vite must allow the portal host in `server.allowedHosts` for Tailscale Serve access.
