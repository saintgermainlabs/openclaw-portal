# Patterns

## Always name the executor
State who runs the prompt (Cursor agent, OpenClaw agent, research model) and what tools they have.

## Prefer verbs over vibes
“Inspect `src/api`, add endpoint X, run `npm test`” beats “be thorough and professional.”

## Verification is part of the prompt
If you cannot say how success is checked, the prompt is unfinished.

## Scope fences
Explicitly forbid unrelated refactors; coding agents expand scope by default.

## Target forks structure
Same goal → different sections for `cursor` vs `openclaw` vs `figma`. Never force one skeleton on every target.
