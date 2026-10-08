4#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/backend"
UI_DIR="$ROOT/web"

cleanup() {
  trap - INT TERM EXIT
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(dotnet watch --project "$(find "$API_DIR" -name '*.csproj' -not -path '*/bin/*' -not -path '*/obj/*' | head -1)" run --no-hot-reload) &
(cd "$UI_DIR" && { [ -d node_modules ] || npm install; } && npx ng serve --open) &

wait
