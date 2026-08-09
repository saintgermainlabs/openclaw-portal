# n8n workflows (OpenClaw portal)

Credential isolation: secrets stay in **n8n**, not in OpenClaw.

## prompt-generate

Path: [`workflows/prompt-generate.json`](workflows/prompt-generate.json)

```text
Webhook → Normalize → OpenRouter → Format
       → MetaMCP initialize → tools/call docmost__create_page → Respond
```

- LLM: OpenRouter (`openai/gpt-4o` default)
- Docmost write: MetaMCP **`/metamcp/openclaw/mcp`** (not `/metamcp/n8n/mcp` — that endpoint’s tools/list hangs)
- Staging space: Docmost Prompts `019fd6a5-7ed6-7ab0-ba42-d93755c420fc`

### Import / re-import

1. Open https://n8n.tiger-bushmaster.ts.net
2. Import `workflows/prompt-generate.json` (replace existing if updating)
3. Credentials (Header Auth):

| Credential | Name | Value |
|------------|------|-------|
| OpenRouter | `Authorization` | `Bearer sk-or-…` |
| MetaMCP | `X-API-Key` | `sk_mt_…` (same as `METAMCP_API_KEY`) |

4. Attach **OpenRouter** on the OpenRouter node; attach **MetaMCP** on both MetaMCP nodes
5. Activate workflow
6. Smoke test:

```bash
export N8N_URL=https://n8n.tiger-bushmaster.ts.net
curl -sS -X POST "$N8N_URL/webhook/prompt-generate" \
  -H 'content-type: application/json' \
  -d '{"brief":"Write a Cursor prompt to add a healthcheck endpoint","target":"cursor"}'
```

Expect JSON with `ok`, `url`, and a new page under Docmost Prompts.
