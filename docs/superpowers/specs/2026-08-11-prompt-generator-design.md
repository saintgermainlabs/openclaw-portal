# Prompt Generator — Design Spec

**Date:** 2026-08-11  
**Status:** approved for implementation planning (revised: multi-channel standalone tool)  
**Product repo:** standalone `prompt-generator` (not inside OpenClaw portal)

## Summary

**Prompt Generator is a standalone, independent tool.** Its stable interface is an HTTP webhook (n8n). Any channel can call it: OpenClaw Telegram, openclaw-portal, Cursor, CLI/`curl`, and later Hermes. Callers only send a brief (+ optional metadata); the service generates the prompt via OpenRouter and stores it in Docmost. Credentials stay in n8n.

Website-creation is deferred. This tool has **no hard dependency** on website-creation (callers may already have a prompt).

## Goals

- Channel-agnostic prompt generation service (not a Cursor-only plugin)
- Multi-purpose targets (cursor, openclaw, research, infra, figma, lovable, etc.)
- Single source of truth for the pipeline outside the portal repo
- Docmost Prompts as the staging store
- Thin adapters per channel; shared webhook contract

## Non-goals (v1)

- Moving full portal `agents/prompt-engineer/` methodology tree
- New MetaMCP namespace for prompts
- Embedding OpenRouter or MetaMCP credentials in any caller
- Website-creation plugin
- Rebuilding n8n logic from scratch
- Hermes adapter implementation (document as future caller only)
- Per-channel auth redesign (keep current Tailnet/n8n posture; harden later)

## Architecture

```text
                    ┌─────────────────────────┐
  Telegram (OpenClaw)──┤                         │
  openclaw-portal ──────┤  POST /webhook/        │
  Cursor plugin ────────┤  prompt-generate       │
  curl / scripts ───────┤                         │
  Hermes (future) ──────┤                         │
                    └───────────┬─────────────┘
                                ▼
              n8n: Normalize → OpenRouter → Format
                                ▼
              MetaMCP /metamcp/openclaw/mcp
              docmost__create_page (Prompts space)
                                ▼
              JSON { ok, url, pageId, slug, … }
```

**Principle:** The product *is* the webhook pipeline. Cursor/OpenClaw/portal/Telegram/Hermes are interchangeable frontends.

### Credential boundary

| Secret | Location |
|--------|----------|
| OpenRouter API key | n8n only |
| MetaMCP API key | n8n only (`X-API-Key`) |
| Callers | `N8N_URL` (and channel-native config); no LLM/Docmost keys |

## Repository layout (v1)

```text
prompt-generator/
  README.md
  workflows/prompt-generate.yaml       # portable pipeline spec
  n8n/workflows/prompt-generate.json   # importable export
  n8n/README.md
  docs/api.md                          # webhook contract for all callers
  adapters/
    cursor-plugin/                     # → ~/.cursor/plugins/local/prompt-generator
    openclaw/                          # skill + thin agent (Telegram + gateway)
    portal/                            # notes / example BFF call for openclaw-portal
    hermes/                            # stub README for future adapter
  docs/
```

## Webhook contract (canonical API)

**Endpoint:** `POST {N8N_URL}/webhook/prompt-generate`  
**Default base:** `https://n8n.tiger-bushmaster.ts.net`

| Field | Required | Description |
|-------|----------|-------------|
| `brief` | yes | Operator idea / brief |
| `target` | no | `auto`, `cursor`, `openclaw`, `claude-code`, `figma`, `lovable`, `research`, `infra`, `generic` |
| `title` | no | Docmost page title |
| `slug` | no | Page slug |
| `model` | no | OpenRouter model (default `openai/gpt-4o`) |
| `status` | no | e.g. `draft` |
| `source` | no | Caller id for ops/debug: `telegram`, `portal`, `cursor`, `openclaw`, `hermes`, `curl`, … |

**Success response:** JSON including `ok`, `url`, `pageId`, `slug`, `target`, `model`, etc.

**Docmost:** Prompts space `019fd6a5-7ed6-7ab0-ba42-d93755c420fc`.

Any new channel must only implement: gather brief → POST contract → show `url` (and errors).

## Channel adapters

### OpenClaw Telegram
- OpenClaw skill/agent invokes the webhook when the user asks to generate a prompt in Telegram
- Reply with Docmost link (+ short status); no local LLM persistence path for this product flow

### openclaw-portal
- Portal BFF or client POSTs to the same webhook (replace or wrap any portal-local compile path for *persisted* prompts)
- UI shows returned `url`
- Portal may keep interactive `prompt-engineer` chat separately; **persistence** goes through this tool

### Cursor
- Plugin command `/prompt-generate` + skill → same webhook
- No MetaMCP in the plugin

### Hermes (future)
- `adapters/hermes/` stub documenting the same HTTP contract
- No implementation in v1

### CLI
- Documented `curl` example remains the reference smoke test

## n8n / MetaMCP ops

- Canonical workflow files live in this repo; import into existing n8n
- MetaMCP endpoint: **`/metamcp/openclaw/mcp`** (not `/metamcp/n8n/mcp`)
- Optional: accept/pass through `source` in normalize for logging (non-breaking)

## Portal / OpenClaw cutover

1. Create `prompt-generator` GitHub repo; seed workflow YAML/JSON + API docs
2. Add adapters (Cursor, OpenClaw/Telegram skill, portal call example, Hermes stub)
3. Re-import n8n JSON from new repo
4. Point portal + OpenClaw docs at webhook; wire Telegram + portal to POST it
5. Smoke tests per channel: `curl`, Cursor, Telegram, portal
6. Remove or deprecate duplicate “persist prompt” logic in portal once green

## Relationship to website-creation (future)

- Separate product
- May call this tool *or* use an existing Docmost prompt
- No required coupling

## Risks

| Risk | Mitigation |
|------|------------|
| Callers bypass webhook and invent local flows | Docs + adapters insist on HTTP contract |
| Doc drift | This repo owns pipeline + API docs |
| Webhook auth | v1 Tailnet/n8n as today; shared secret/header later if exposing beyond Tailnet |
| Dual MCP registration | Callers never attach Docmost/OpenRouter for this flow |

## Success criteria

- Same brief → same Docmost result whether invoked from Telegram, portal, Cursor, or `curl`
- No caller holds OpenRouter/MetaMCP secrets
- New channels (e.g. Hermes) only need a thin HTTP adapter
- Portal is not the source of truth for this pipeline after cutover
