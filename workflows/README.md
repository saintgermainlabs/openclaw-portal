# Workflow YAML catalog

Store one workflow definition per child page (or paste YAML below). These are **portable specs** for n8n / OpenClaw — secrets stay in n8n credentials, never in YAML.

## Schema

```yaml
apiVersion: openclaw.workflow/v1
kind: Workflow
metadata:
  id: example-id              # kebab-case, unique
  title: Human title
  status: draft               # draft | iterating | ready | archived
  version: 1
  owner: portal
  tags: []
spec:
  trigger:
    type: webhook             # webhook | cron | manual | openclaw
    path: /webhook/example    # if webhook
    # cron: "0 10,20 * * *"   # if cron
  input:
    required: [brief]
    properties:
      brief: { type: string }
      target: { type: string, default: generic }
  steps:
    - id: generate
      uses: openrouter.chat
      with:
        model: openai/gpt-4o
        # system/prompt refs — no API keys here
    - id: persist
      uses: metamcp.tool
      with:
        endpoint: https://metamcp.tiger-bushmaster.ts.net/metamcp/openclaw/mcp
        tool: docmost__create_page
        space: prompts
  output:
    docmost_space: prompts
    fields: [slug, url, body]
```

## prompt-generate

```yaml
apiVersion: openclaw.workflow/v1
kind: Workflow
metadata:
  id: prompt-generate
  title: Prompt generate
  status: iterating
  version: 2
  owner: portal
  tags: [prompts, n8n, openrouter, docmost]
spec:
  trigger:
    type: webhook
    path: /webhook/prompt-generate
    base_url: https://n8n.tiger-bushmaster.ts.net
  input:
    required: [brief]
    properties:
      brief: { type: string, description: Operator brief for the executable prompt }
      target:
        type: string
        enum: [auto, cursor, openclaw, claude-code, figma, lovable, research, infra, generic]
        default: generic
      title: { type: string }
      slug: { type: string }
      model: { type: string, default: openai/gpt-4o }
      status: { type: string, default: draft }
  credentials_in_n8n:
    - name: OpenRouter
      header: Authorization
      value_hint: "Bearer sk-or-…"
    - name: MetaMCP
      header: X-API-Key
      value_hint: sk_mt_…
  steps:
    - id: normalize
      uses: n8n.code
      with:
        validates: [brief]
        defaults:
          spaceId: "019fd6a5-7ed6-7ab0-ba42-d93755c420fc"
          metamcpUrl: https://metamcp.tiger-bushmaster.ts.net/metamcp/openclaw/mcp
    - id: generate
      uses: openrouter.chat
      with:
        url: https://openrouter.ai/api/v1/chat/completions
        model_from: input.model
        role: prompt-engineer
    - id: format
      uses: n8n.code
      with:
        builds: [pageMarkdown, mcpCreateArgs]
        schema_ref: _Schema
    - id: metamcp_init
      uses: metamcp.initialize
      with:
        endpoint_from: normalize.metamcpUrl
    - id: persist
      uses: metamcp.tool
      with:
        tool: docmost__create_page
        arguments_from: format.mcpCreateArgs
  output:
    docmost_space: prompts
    response: [ok, slug, status, version, model, target, pageId, slugId, url, body]
  n8n_import: n8n/workflows/prompt-generate.json
```

## website-research (planned)

Website jobs **start by scraping available pages** and gathering max context before generation.

```yaml
apiVersion: openclaw.workflow/v1
kind: Workflow
metadata:
  id: website-research
  title: Website scrape then brief
  status: draft
  version: 1
  owner: portal
  tags: [website, scrape, research]
spec:
  trigger:
    type: webhook
    path: /webhook/website-research
  input:
    required: [url]
    properties:
      url: { type: string }
      max_pages: { type: integer, default: 50 }
  steps:
    - id: crawl
      uses: scraper.crawl
      with:
        start_from: input.url
        max_pages_from: input.max_pages
        collect: [title, text, links, meta]
    - id: synthesize
      uses: openrouter.chat
      with:
        model: openai/gpt-4o
        role: research-brief
    - id: persist
      uses: metamcp.tool
      with:
        tool: docmost__create_page
        space: prompts   # or a Websites space later
  notes: >
    Do not invent site content before crawl. Research-first is mandatory.
```

## Index

| id | status | n8n path |
|----|--------|----------|
| prompt-generate | iterating | /webhook/prompt-generate |
| website-research | draft | /webhook/website-research |
| business-enrichment | draft | /webhook/business-enrichment |

## Staging (stage 2)

- Docmost parent: **scraped_data** — JSON business records (see `scraped_data.md`)
- Local temp images: `data/scraped/{slug}/images/`
- Spec: `business-enrichment.yaml` v2

