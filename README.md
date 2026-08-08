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

## Coolify Deployment

Coolify injects secrets directly as environment variables into running containers and does not require `.env` files.

### 1. Deployment via Docker Compose (Recommended with Tailscale sidecar)
- Set build command / compose location to `docker-compose.prod.yml`.
- Under Coolify **Environment Variables / Secrets**, define:

| Variable | Description | Required / Default |
|----------|-------------|-------------------|
| `TS_AUTHKEY` | Tailscale auth key (`tskey-auth-...`) | **Required** |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token for OpenClaw Gateway | Optional (runs in mock mode if unset) |
| `OPENCLAW_GATEWAY_URL` | OpenClaw Gateway WSS endpoint | `wss://openclaw.tiger-bushmaster.ts.net` |
| `OPENCLAW_HTTP_URL` | OpenClaw HTTP base URL | `https://openclaw.tiger-bushmaster.ts.net` |
| `PROMPT_ENGINEER_AGENT_ID` | Specialist agent ID | `prompt-engineer` |
| `PROMPT_ENGINEER_MODEL` | Specialist model | `openai/gpt-5.5` |
| `DOCMOST_URL` | Docmost URL | `https://docmost.tiger-bushmaster.ts.net` |
| `QUARTZ_URL` | Quartz URL | `https://quartz.tiger-bushmaster.ts.net` |
| `SILVERBULLET_URL` | SilverBullet URL | `https://silverbullet.tiger-bushmaster.ts.net` |

### 2. Standalone Dockerfile Deployment
If deploying without the Tailscale sidecar in Coolify:
- Target stage: `production` (exposes port `8787`).
- Define the environment variables listed above directly in Coolify.
- Node BFF will log `[openclaw-portal] no .env file on disk — using environment variables from process` and read secrets directly from `process.env`.

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
