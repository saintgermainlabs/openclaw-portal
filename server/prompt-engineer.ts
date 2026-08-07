/** Prompt Engineer — agent routing + target-aware local compiler. */

export const PROMPT_ENGINEER_AGENT_ID =
  process.env.PROMPT_ENGINEER_AGENT_ID ||
  process.env.PROMPT_SMITH_AGENT_ID ||
  'prompt-engineer'

export const PROMPT_ENGINEER_MODEL =
  process.env.PROMPT_ENGINEER_MODEL ||
  process.env.PROMPT_SMITH_MODEL ||
  'openai/gpt-5.5'

/** @deprecated use PROMPT_ENGINEER_* */
export const PROMPT_SMITH_AGENT_ID = PROMPT_ENGINEER_AGENT_ID
/** @deprecated use PROMPT_ENGINEER_* */
export const PROMPT_SMITH_MODEL = PROMPT_ENGINEER_MODEL

export type PromptTarget =
  | 'auto'
  | 'cursor'
  | 'openclaw'
  | 'figma'
  | 'lovable'
  | 'claude-code'
  | 'research'
  | 'infra'
  | 'generic'

export type CompiledPrompt = {
  title: string
  slug: string
  status: 'draft' | 'iterating' | 'ready'
  version: number
  body: string
  rationale: string
  agentId: string
  model: string
  target: PromptTarget
  mock: boolean
}

const TARGET_ALIASES: Record<string, PromptTarget> = {
  auto: 'auto',
  cursor: 'cursor',
  coding: 'cursor',
  code: 'cursor',
  'claude-code': 'claude-code',
  claudecode: 'claude-code',
  openclaw: 'openclaw',
  oc: 'openclaw',
  figma: 'figma',
  design: 'figma',
  lovable: 'lovable',
  research: 'research',
  infra: 'infra',
  infrastructure: 'infra',
  coolify: 'infra',
  tailscale: 'infra',
}

export function parseTarget(input?: string | null): PromptTarget | undefined {
  if (!input) return undefined
  return TARGET_ALIASES[input.trim().toLowerCase()]
}

/** Strip chat/meta framing so Goal is the work, not the request to write a prompt. */
export function normalizeObjective(raw: string): string {
  let text = raw.trim()

  // Drop leading conversational wrappers
  text = text.replace(
    /^(hey[, ]+|hi[, ]+|please\s+|can you\s+|could you\s+|would you\s+|i need you to\s+|i want you to\s+)/i,
    '',
  )
  text = text.replace(
    /^(generate|write|create|draft|make|build)\s+(me\s+)?(a\s+|an\s+)?(good\s+|great\s+|better\s+)?prompt\s+(for|to|that|which)\s+/i,
    '',
  )
  text = text.replace(/^(a\s+)?prompt\s+(for|to)\s+/i, '')
  text = text.replace(/^(to\s+)/i, '')

  // If still starts with "create/deploy/set up", keep — that IS the objective
  text = text.trim()

  // Capitalize first letter for Goal lines
  if (text) text = text.charAt(0).toUpperCase() + text.slice(1)

  // Ensure it reads as an imperative goal when it was "create a Ghost…"
  if (!/^(create|deploy|build|add|implement|set up|configure|migrate|fix|refactor)\b/i.test(text)) {
    if (/^(a|an)\s+/i.test(text)) text = `Create ${text}`
  }

  return text.replace(/\?+$/, '').trim()
}

function inferTarget(text: string): PromptTarget {
  const lower = text.toLowerCase()
  if (/figma|design system|ui mock|landing page layout/.test(lower)) return 'figma'
  if (/lovable/.test(lower)) return 'lovable'
  if (/coolify|tailscale|docker compose|sidecar|ghost|caddy|traefik|nginx proxy/.test(lower)) return 'infra'
  if (/research|synthes|sources|cite/.test(lower)) return 'research'
  if (/openclaw skill|mcp server|gateway token|prompt-workshop/.test(lower)) return 'openclaw'
  if (/pull request|pr review|\.tsx|\.ts\b|repository|refactor|implement in (the )?repo/.test(lower))
    return 'cursor'
  return 'generic'
}

/** Resolve UI target vs brief. `auto` always defers to inference. */
export function resolveTarget(requested: PromptTarget | undefined, brief: string): PromptTarget {
  const inferred = inferTarget(brief)
  if (!requested || requested === 'auto' || requested === 'generic') return inferred

  // Strong infra signals beat an accidental Cursor default from the UI
  const lower = brief.toLowerCase()
  const strongInfra = /coolify|tailscale|sidecar|docker compose|ghost/.test(lower)
  if (strongInfra && (requested === 'cursor' || requested === 'claude-code')) {
    // Keep coding executor, but content will be infra-compose oriented
    return requested
  }
  if (strongInfra && requested !== 'infra' && requested !== 'cursor' && requested !== 'claude-code') {
    return 'infra'
  }
  return requested
}

/** Extract `--target X` or leading `/prompt cursor …` style hints from a brief. */
export function extractTargetAndBrief(raw: string): { target: PromptTarget; brief: string } {
  let text = raw.trim()
  let target: PromptTarget | undefined

  const flag = text.match(/^\/?prompt\s+--target\s+(\S+)\s+/i)
  if (flag) {
    target = parseTarget(flag[1])
    text = text.slice(flag[0].length).trim()
  } else {
    const slash = text.match(
      /^\/?prompt\s+(auto|cursor|openclaw|figma|lovable|claude-code|research|infra|coding)\s+/i,
    )
    if (slash) {
      target = parseTarget(slash[1])
      text = text.slice(slash[0].length).trim()
    }
  }

  const objective = normalizeObjective(text)
  target = resolveTarget(target, objective)
  return { target, brief: objective || text }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'untitled-prompt'
  )
}

function titleFromObjective(objective: string): string {
  const first = objective.split(/[.!?\n]/)[0]?.trim() || 'Untitled prompt'
  return first.charAt(0).toUpperCase() + first.slice(1).slice(0, 80)
}

function sections(parts: Record<string, string | undefined>): string {
  const order = [
    'Goal',
    'Context',
    'Existing State',
    'Requirements',
    'Implementation',
    'Constraints',
    'Verification',
    'Failure behaviour',
    'Deliverables',
  ]
  return order
    .filter((k) => parts[k]?.trim())
    .map((k) => `# ${k}\n${parts[k]!.trim()}`)
    .join('\n\n')
}

type StackHint = 'ghost-coolify-tailscale' | 'coolify-tailscale' | 'none'

function detectStack(objective: string): StackHint {
  const lower = objective.toLowerCase()
  if (/ghost/.test(lower)) return 'ghost-coolify-tailscale'
  if (/coolify|tailscale|sidecar/.test(lower)) return 'coolify-tailscale'
  return 'none'
}

function ghostCoolifyTailscalePrompt(executor: 'cursor' | 'infra'): string {
  const who =
    executor === 'cursor'
      ? 'You are a coding agent working in a repo that already contains Coolify + Tailscale sidecar compose examples (see `tailscale-sidecars-coolify/` and similar).'
      : 'You are implementing a Coolify Compose resource for a private Tailnet service.'

  return sections({
    Goal: 'Create a Coolify-ready Docker Compose stack that runs Ghost CMS behind a Tailscale sidecar with private HTTPS Serve (no public ports, no Funnel).',

    Context: `${who}

Canonical pattern to copy (do not invent a new networking model):
- Service \`<app>-tailscale\` runs \`tailscale/tailscale:latest\` with \`/dev/net/tun\`, \`NET_ADMIN\`/\`NET_RAW\`, \`TS_AUTHKEY\`, \`TS_HOSTNAME\`, \`TS_SERVE_CONFIG\`.
- App service uses \`network_mode: service:<app>-tailscale\` so it shares the sidecar network namespace.
- Tailscale Serve proxies \`https://<hostname>.<tailnet>.ts.net\` → \`http://127.0.0.1:<ghost-port>\`.
- Escape Serve domain as \`$$\${TS_CERT_DOMAIN}\` in Compose config content.
- Coolify resource maps \`TS_AUTHKEY={{project.TS_AUTHKEY}}\` — never bake the key into git.
- Do **not** set \`container_name\`. Do **not** publish host ports.

Ghost notes:
- Image: official \`ghost:5-alpine\` (or current Ghost 5 stable).
- Ghost listens on **2368** inside the container.
- Put **MySQL and Ghost both** on \`network_mode: service:ghost-tailscale\` so DB is \`127.0.0.1:3306\` and Ghost is \`127.0.0.1:2368\` inside the shared netns (same pattern as multi-process sidecar stacks).
- Persist Ghost content and MySQL data in named volumes.
- Ghost \`url\` must be the Tailnet HTTPS URL, e.g. \`https://ghost.tiger-bushmaster.ts.net\` (wrong url breaks admin links).`,

    'Existing State': `Before writing files:
1. Locate existing sidecar examples (SilverBullet, OpenClaw, Uptime Kuma style compose).
2. Note how Serve JSON, volumes, and labels (\`app.name\`, \`app.component\`) are done.
3. Summarize the pattern in 3–6 bullets, then implement Ghost the same way.`,

    Requirements: `- Create a Coolify Compose resource directory (e.g. \`tailscale-sidecars-coolify/ghost/\` or \`ghost/\`) containing:
  - \`docker-compose.yaml\`
  - Serve config (Compose \`configs:\` inline JSON **or** \`tailscale/serve.json\` — match repo convention)
  - \`.env.example\`
  - \`README.md\`
- Services (all sharing the sidecar network namespace so they can use localhost):
  1. \`ghost-tailscale\` — \`tailscale/tailscale:latest\`, hostname \`ghost\`, tun + NET_ADMIN/NET_RAW, \`TS_AUTHKEY\`, \`TS_HOSTNAME=ghost\`, \`TS_SERVE_CONFIG\`, state volume
  2. \`ghost-db\` — MySQL 8 or MariaDB, \`network_mode: service:ghost-tailscale\`, data volume, listens on \`127.0.0.1:3306\` inside the netns
  3. \`ghost\` — \`ghost:5-alpine\` (or current Ghost 5), \`network_mode: service:ghost-tailscale\`, depends_on sidecar + db, content volume, env:
     - \`url\` = \`https://ghost.tiger-bushmaster.ts.net\` (or \`\${GHOST_URL}\`)
     - DB host \`127.0.0.1\`, port \`3306\`, user/password/database from env
- Tailscale Serve: TCP 443 HTTPS → proxy \`/\` to \`http://127.0.0.1:2368\`
- Use \`$$\${TS_CERT_DOMAIN}\` in Compose-embedded Serve JSON
- Labels: \`app.name: ghost\`; components \`tailscale-sidecar\`, \`database\`, \`application\`
- Healthcheck hitting Ghost on \`127.0.0.1:2368\`
- Coolify: map \`TS_AUTHKEY={{project.TS_AUTHKEY}}\`; document other secrets as Coolify env
- README must state the private URL: \`https://ghost.<tailnet>.ts.net\` and \`/ghost\` for admin`,

    Implementation: `1. Open an existing sidecar compose (SilverBullet / Uptime Kuma / OpenClaw) and copy its structure.
2. Add the three services above; do not introduce a second reverse proxy.
3. Put real env **names** in \`.env.example\` with empty values — never commit secrets.
4. Double-check Ghost \`url\` uses https Tailnet hostname (Ghost otherwise generates wrong links).`,

    Constraints: `- Tailnet-only: no Funnel, no public \`ports:\`
- Never commit \`TS_AUTHKEY\` or DB passwords
- Do not set \`container_name\`
- Do not replace Tailscale Serve with Coolify's public proxy
- Prefer Ghost 5 + MySQL 8`,

    Verification: `- \`docker compose config\` succeeds
- After deploy: MagicDNS name \`ghost\` exists; from a tailnet client \`curl -I https://ghost.<tailnet>.ts.net\` is 200/302
- \`https://ghost.<tailnet>.ts.net/ghost\` loads admin setup/login
- Restart stack; Ghost content + MySQL data persist via volumes`,

    'Failure behaviour': `If Ghost boots but links are \`http://localhost:2368\`, fix \`url\` to the Tailnet HTTPS URL — do not open public ports as a workaround.`,

    Deliverables: `- Compose + Serve config + \`.env.example\` + README
- Confirmation of Serve→2368 and DB→127.0.0.1:3306
- Verification commands and results`,
  })
}

function coolifyTailscaleGenericPrompt(objective: string, executor: 'cursor' | 'infra'): string {
  return sections({
    Goal: objective,
    Context: `${executor === 'cursor' ? 'Coding agent in the sidecar-compose repo.' : 'Infra implementer.'}
Copy the existing Tailscale sidecar + Coolify conventions: sidecar owns netns; app uses \`network_mode: service:<app>-tailscale\`; Serve on 443; \`$$\${TS_CERT_DOMAIN}\`; \`TS_AUTHKEY\` from Coolify project env; no public ports; no Funnel; no \`container_name\`.`,
    'Existing State': 'Read one working example compose first; list the pattern in bullets; then implement the new app the same way.',
    Requirements: `- Identify the app's internal listen port
- Add \`<app>-tailscale\` + app service
- Serve JSON proxies to \`http://127.0.0.1:<port>\`
- Volumes for app data + tailscale state
- Labels \`app.name\` / \`app.component\`
- \`.env.example\` + README with Coolify \`TS_AUTHKEY={{project.TS_AUTHKEY}}\` mapping`,
    Implementation: 'Mirror an existing converted stack; change hostname, image, port, volumes only as needed.',
    Constraints: '- No public ports, no Funnel, no secrets in git',
    Verification: '- `docker compose config`; HTTPS URL on tailnet after deploy',
    Deliverables: '- Compose files, env example, README, verification notes',
  })
}

/** Deterministic, target-aware draft when the live agent is unavailable. */
export function compilePromptLocally(
  rawBrief: string,
  opts?: { title?: string; target?: PromptTarget },
): CompiledPrompt {
  const parsed = extractTargetAndBrief(rawBrief)
  const objective = parsed.brief
  let target = opts?.target && opts.target !== 'auto' ? resolveTarget(opts.target, objective) : parsed.target
  if (target === 'auto') target = inferTarget(objective)

  const stack = detectStack(objective)
  const title =
    opts?.title?.trim() ||
    (stack === 'ghost-coolify-tailscale'
      ? 'Ghost on Coolify with Tailscale sidecar'
      : titleFromObjective(objective))
  const slug = slugify(`${target}-${title}`)

  let bodyCore = ''

  if (stack === 'ghost-coolify-tailscale') {
    const exec = target === 'cursor' || target === 'claude-code' ? 'cursor' : 'infra'
    bodyCore = ghostCoolifyTailscalePrompt(exec)
    if (target !== 'cursor' && target !== 'claude-code' && target !== 'infra') target = 'infra'
  } else if (stack === 'coolify-tailscale') {
    const exec = target === 'cursor' || target === 'claude-code' ? 'cursor' : 'infra'
    bodyCore = coolifyTailscaleGenericPrompt(objective, exec)
  } else if (target === 'cursor' || target === 'claude-code') {
    bodyCore = sections({
      Goal: objective,
      Context: `- Executor: ${target === 'claude-code' ? 'Claude Code' : 'Cursor'}
- Inspect the repository before any edits.
- Prefer extending existing patterns over new abstractions.`,
      'Existing State':
        'After reading the relevant code, summarize the current approach for the touched area in 3–6 bullets, then implement.',
      Requirements: `- Implement: ${objective}
- Touch only files required for the change
- Preserve existing architecture where it still fits`,
      Implementation: `1. Search and read relevant files first.
2. Implement the change.
3. Keep public APIs stable unless the brief says otherwise.
4. Do not rewrite unrelated modules.`,
      Constraints: `- No drive-by refactors
- No new dependencies without justification
- No secrets in source`,
      Verification: `- Run the project's tests / lint / typecheck when available
- Note what you ran and what you could not run`,
      Deliverables: `- Files changed
- Verification performed
- Unresolved issues`,
    })
  } else if (target === 'openclaw') {
    bodyCore = sections({
      Goal: objective,
      Context:
        'You are an OpenClaw agent. Use only the skills/tools you actually have. Persist artifacts to the paths specified.',
      Requirements: objective,
      Implementation: `1. Confirm required skills/tools are available.
2. Execute with tools as needed.
3. Write persistent artifacts to the stated paths.
4. Verify against success criteria.`,
      Constraints: `- Do not invent credentials
- Do not call unrelated infra skills unless required for this goal`,
      Verification: 'Report paths written, commands run, and whether success criteria passed.',
      'Failure behaviour':
        'If blocked (auth, path, missing skill): stop, report the blocker, do not weaken security to proceed.',
      Deliverables: '- Status, artifacts, blockers',
    })
  } else if (target === 'figma' || target === 'lovable') {
    bodyCore = sections({
      Goal: objective,
      Context: `Target: ${target}. Prefer UX clarity over pixel micromanagement.`,
      Requirements: `- Primary user flows for: ${objective}
- Page / screen hierarchy, layout system, components, states
- Responsive + interaction behaviour
- Auth / empty / error states where relevant`,
      Constraints: '- Avoid needless per-pixel specs unless required',
      Verification: '- Checklist of flows and states covered',
      Deliverables: '- Structured design/build brief the executor can follow without guessing',
    })
  } else if (target === 'research') {
    bodyCore = sections({
      Goal: objective,
      Requirements: `- Gather sources
- Evaluate source quality
- Check contradictions
- Cite claims
- Separate evidence from inference`,
      Constraints: '- Do not invent citations',
      Verification: '- Every material claim has a source or is marked inference',
      Deliverables: '- Brief with findings, disagreements, recommendation, next actions',
    })
  } else if (target === 'infra') {
    bodyCore = coolifyTailscaleGenericPrompt(objective, 'infra')
  } else {
    bodyCore = sections({
      Goal: objective,
      Context: 'State assumptions about the executor explicitly.',
      Requirements: objective,
      Constraints: '- Be concrete; no decorative padding; do not invent requirements',
      Verification: '- State how success is checked',
      'Failure behaviour': '- If blocked by missing material facts, stop and list them',
      Deliverables: '- The completed artifact or outcome described in Goal',
    })
  }

  const body = `---
title: "${title}"
slug: "${slug}"
target: "${target}"
status: draft
version: 1
---

${bodyCore}
`

  return {
    title,
    slug,
    status: 'draft',
    version: 1,
    body: body.trim() + '\n',
    rationale:
      stack === 'ghost-coolify-tailscale'
        ? `Compiled a concrete Ghost + Coolify + Tailscale Serve prompt (not a meta “write a prompt” stub). target=${target}`
        : `Local compiler · target=${target} · objective normalized. Set OPENCLAW_GATEWAY_TOKEN for live Prompt Engineer drafts.`,
    agentId: PROMPT_ENGINEER_AGENT_ID,
    model: PROMPT_ENGINEER_MODEL,
    target,
    mock: true,
  }
}

export function buildPromptEngineerInstruction(
  brief: string,
  opts?: { title?: string; target?: PromptTarget },
): string {
  const parsed = extractTargetAndBrief(brief)
  const target =
    opts?.target && opts.target !== 'auto' ? resolveTarget(opts.target, parsed.brief) : parsed.target
  const objective = parsed.brief
  const titleLine = opts?.title?.trim() ? `Preferred title: ${opts.title.trim()}\n` : ''

  return `[OpenClaw Portal → Prompt Engineer]
Design an *executable* prompt for another agent. Do NOT echo the chat request.

CRITICAL:
- Goal = the work to perform (e.g. "Create a Ghost Coolify stack with Tailscale sidecar").
- Goal ≠ "Generate a prompt…" / "Can you write a prompt…".
- Fill every section with concrete stack details (images, ports, networks, env var NAMES, verification commands).
- Empty boilerplate sections are a failure.

Target executor: ${target}
${titleLine}Normalized objective:
${objective}

Original operator text (for nuance only):
${brief.trim()}

Follow AGENTS.md + prompt-engineering skill.
Silent rubric; revise once if any category < 4.
Reply: status line, then FULL prompt in one \`\`\`markdown fence.`
}

/** @deprecated */
export const buildPromptSmithInstruction = buildPromptEngineerInstruction
