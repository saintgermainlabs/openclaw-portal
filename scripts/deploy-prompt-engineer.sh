#!/usr/bin/env bash
# Deploy Prompt Engineer specialist into OpenClaw.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/agents/prompt-engineer"
AGENT_ID="${PROMPT_ENGINEER_AGENT_ID:-${PROMPT_SMITH_AGENT_ID:-prompt-engineer}}"
MODEL="${PROMPT_ENGINEER_MODEL:-${PROMPT_SMITH_MODEL:-openai/gpt-5.5}}"
WORKSPACE="${PROMPT_ENGINEER_WORKSPACE:-$HOME/.openclaw/workspace-prompt-engineer}"

if [[ ! -d "$SRC" ]]; then
  echo "missing agent workspace source: $SRC" >&2
  exit 1
fi

mkdir -p "$WORKSPACE"
rsync -a \
  --exclude '.git' \
  "$SRC/" "$WORKSPACE/"

# OpenClaw loads workspace skills from <workspace>/skills
mkdir -p "$WORKSPACE/skills"
if [[ -d "$SRC/skills/prompt-engineering" ]]; then
  rsync -a "$SRC/skills/prompt-engineering/" "$WORKSPACE/skills/prompt-engineering/"
fi

echo "Synced workspace → $WORKSPACE"

if ! command -v openclaw >/dev/null 2>&1; then
  echo "openclaw CLI not on PATH — run on the gateway host:" >&2
  echo "  openclaw agents add $AGENT_ID --workspace $WORKSPACE --model $MODEL --non-interactive" >&2
  exit 0
fi

if openclaw agents list 2>/dev/null | grep -qE "(^|[[:space:]])$AGENT_ID([[:space:]]|$)"; then
  echo "Agent '$AGENT_ID' exists — refreshing model + workspace"
  openclaw config set "agents.list" --strict-json --merge 2>/dev/null || true
  # Best-effort model pin via agents add is idempotent enough on many builds;
  # also try config paths used by current CLI:
  openclaw agents add "$AGENT_ID" --workspace "$WORKSPACE" --model "$MODEL" --non-interactive 2>/dev/null || true
else
  openclaw agents add "$AGENT_ID" \
    --workspace "$WORKSPACE" \
    --model "$MODEL" \
    --non-interactive
fi

openclaw agents set-identity \
  --agent "$AGENT_ID" \
  --name "Prompt Engineer" \
  --emoji "🧪" \
  2>/dev/null || true

# Prefer only prompt-related skills for this agent when the config key exists
openclaw config set "agents.entries.${AGENT_ID}.skills" \
  '["prompt-engineering","prompt-workshop"]' --strict-json 2>/dev/null || true

echo "Prompt Engineer ready: agentId=$AGENT_ID model=$MODEL"
echo "Portal: PROMPT_ENGINEER_AGENT_ID=$AGENT_ID PROMPT_ENGINEER_MODEL=$MODEL"
echo
echo "Optional: keep main on a cheap model; this agent stays on $MODEL"
