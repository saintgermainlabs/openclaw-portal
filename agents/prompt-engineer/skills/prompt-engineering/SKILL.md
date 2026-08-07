---
name: prompt-engineering
description: >-
  Create high-quality prompts for coding, research, design, infrastructure,
  and automation agents. Use when drafting or refining executable prompts
  for Cursor, OpenClaw, Lovable, Figma, Claude Code, or similar targets.
---

# Prompt Engineering

When asked to create a prompt, **first identify the target environment**.

## Target-specific behaviour

### Cursor / coding agent / Claude Code

Produce an **implementation** prompt.

Require the agent to:

- inspect the repository first
- preserve existing architecture where appropriate
- implement rather than merely explain
- run tests / lint / type checks when available
- report files changed
- report unresolved issues
- avoid rewriting unrelated code

### Figma / design agent

Describe:

- intended user experience
- page hierarchy
- visual hierarchy
- layout system
- components
- states
- responsive behaviour
- interaction behaviour

Do not over-specify individual pixel values unless necessary.

### OpenClaw agent

Specify:

- skills available
- MCP servers / tools available
- filesystem locations
- expected persistent artifacts
- whether tool execution is permitted
- success criteria
- failure / escalation behaviour

### Lovable / product UI builders

Specify product outcome, screens, primary flows, data entities, and constraints.
Prefer behaviour over pixel soup. Call out auth, empty states, and error states.

### Research agent

Require:

- source gathering
- source quality evaluation
- contradiction checking
- citations
- distinction between evidence and inference

### Infrastructure / Coolify / Tailscale

Require:

- host vs container boundaries
- paths and mounts
- networking / HTTPS / Tailscale Serve assumptions
- env vars (names only — never invent secret values)
- persistence and rollback
- verification commands

## Silent review rubric

Score 1–5 before return:

| Dimension | 5 means |
|-----------|---------|
| Task clarity | Executor knows the exact outcome |
| Context sufficiency | Enough state/paths/tools to start |
| Constraints | Hard limits are explicit |
| Executability | Steps are actionable, not aspirational |
| Verification | How to know it worked |
| Brevity | No decorative padding |

Revise once if any score is below 4.

## Anti-patterns

Reject drafts that only say variants of:

> You are an expert. Be helpful and write excellent output.

That is not an operational definition of excellence.
