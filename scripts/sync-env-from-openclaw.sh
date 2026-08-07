#!/usr/bin/env bash
# Create portal .env from local OpenClaw remote gateway config.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OC_JSON="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$OC_JSON" ]]; then
  echo "Missing $OC_JSON" >&2
  exit 1
fi

python3 - "$OC_JSON" "$ENV_FILE" <<'PY'
import json, sys
from pathlib import Path
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
cfg = json.loads(src.read_text())
remote = (cfg.get("gateway") or {}).get("remote") or {}
url = remote.get("url") or "wss://openclaw.tiger-bushmaster.ts.net"
token = remote.get("token") or ""
if not token:
    raise SystemExit("No gateway.remote.token in openclaw.json — set OPENCLAW_GATEWAY_TOKEN manually in .env")

http = url.replace("wss://", "https://").replace("ws://", "http://")
# strip path/query; do NOT split on ://
from urllib.parse import urlparse
parsed = urlparse(http if "://" in http else "https://" + http)
http = f"{parsed.scheme}://{parsed.hostname}"
if parsed.port:
    http += f":{parsed.port}"

lines = [
    f"OPENCLAW_GATEWAY_URL={url}",
    f"OPENCLAW_GATEWAY_TOKEN={token}",
    f"OPENCLAW_HTTP_URL={http}",
    "PROMPT_ENGINEER_AGENT_ID=prompt-engineer",
    "PROMPT_ENGINEER_MODEL=openai/gpt-5.5",
    "DOCMOST_URL=https://docmost.tiger-bushmaster.ts.net",
    "QUARTZ_URL=https://quartz.tiger-bushmaster.ts.net",
    "SILVERBULLET_URL=https://silverbullet.tiger-bushmaster.ts.net",
    "API_PORT=8787",
    "PORT=5174",
]
dst.write_text("\n".join(lines) + "\n")
print(f"Wrote {dst} (token length {len(token)})")
print("Restart the portal: npm run dev")
PY
