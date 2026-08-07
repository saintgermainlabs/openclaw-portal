#!/usr/bin/env bash
# Compatibility wrapper → deploy-prompt-engineer.sh
exec "$(cd "$(dirname "$0")" && pwd)/deploy-prompt-engineer.sh" "$@"
