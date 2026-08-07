# OpenClaw Portal

Two-pane operator UI for OpenClaw on the private Tailnet.

- **Left:** chat with OpenClaw (gateway token stays on the server BFF)
- **Right:** results — Prompt Generator, Blog Generator, and connected apps (Docmost, Quartz, SilverBullet) rendered through React chrome

**Domain:** `openclaw-portal.tiger-bushmaster.ts.net` (Tailscale hostname `openclaw-portal`)

## Architecture

```text
Browser ──HTTPS :443──► Tailscale sidecar (Serve)
                           │
                           ▼
                     Vite :5173 (HMR over wss)
                           │
                     proxy /api ──► Hono BFF :8787
                                      │
                                      ├─ OpenClaw Gateway (WSS + token)
                                      └─ app registry (docmost / quartz / silverbullet)
```

## Local development (no Docker)

```bash
cp .env.example .env
npm install
npm run dev
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8787
- Without `OPENCLAW_GATEWAY_TOKEN`, the BFF runs in **mock mode** so the panes still work.

## Docker + Tailscale sidecar (HMR)

```bash
cp .env.example .env
# set TS_AUTHKEY and OPENCLAW_GATEWAY_TOKEN
docker compose up --build
```

Source is bind-mounted; Vite HMR uses `wss` on client port `443` through Tailscale Serve.

Coolify: map `TS_AUTHKEY={{project.TS_AUTHKEY}}` on the resource. Do not publish public ports.

## Routes

| Path | What |
|------|------|
| `/` | Portal (chat + result panes) |
| `/site` | Original marketing / archive site |

## Connected apps

Configured via env (see `.env.example`):

- `DOCMOST_URL`
- `QUARTZ_URL`
- `SILVERBULLET_URL`

Native React views: Prompt Generator, Blog Generator, Tools, Knowledge, Blog.

Ask in chat (“generate a prompt…”, “open docmost…”) to focus the result pane.

## Prompt Engineer agent

Prompt generation is a **dedicated specialist**, not the default OpenClaw agent.

| | |
|--|--|
| Agent id | `prompt-engineer` |
| Model pin | `PROMPT_ENGINEER_MODEL` (default `openai/gpt-5.5`) — keep main on Flash/cheap |
| Workspace | `agents/prompt-engineer/` |
| Skill | `skills/prompt-engineering/` (target patterns + rubric) |
| Persist | `prompt-workshop` when saving to `/knowledge/prompts` |

Structure:

```text
agents/prompt-engineer/
├── AGENTS.md          # methodology (not persona fluff)
├── SOUL.md            # concise / exacting
├── IDENTITY.md
├── USER.md
├── prompts/{examples,templates,patterns}/
└── skills/prompt-engineering/SKILL.md
```

Deploy on the gateway host:

```bash
chmod +x scripts/deploy-prompt-engineer.sh
./scripts/deploy-prompt-engineer.sh
# optional:
# PROMPT_ENGINEER_MODEL=anthropic/claude-sonnet-4-5 ./scripts/deploy-prompt-engineer.sh
```

Portal usage:

- UI: pick target (Cursor / OpenClaw / Figma / …) → Generate
- Chat: `/prompt --target cursor Add inventory caching`

Needs `OPENCLAW_GATEWAY_TOKEN` for live model calls; otherwise a target-aware local compiler runs.
