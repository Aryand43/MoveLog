#!/usr/bin/env bash
# Dev loop: backend on Modal (public HTTPS + hot reload), web locally.
#   ./scripts/dev.sh backend   -> modal serve, prints the public URL
#   ./scripts/dev.sh web       -> next dev on :3000
#   ./scripts/dev.sh local     -> backend on localhost:8080 (no public URL, no phone)
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-backend}" in
  backend) exec uv run --with modal --with python-dotenv modal serve modal_app.py ;;
  web)     exec npm -w @movelog/web run dev ;;
  local)   exec npm -w @movelog/backend run dev ;;
  *)       echo "usage: $0 {backend|web|local}" >&2; exit 1 ;;
esac
