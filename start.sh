#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"
test -f .env || { echo '.env is required (copy .env.example)' >&2; exit 1; }
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
  key="${BASH_REMATCH[1]}"; value="${BASH_REMATCH[2]}"
  if [[ "$value" == \"*\" && "$value" == *\" ]] || [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  [[ -n "${!key+x}" ]] || export "$key=$value"
done < .env
: "${DATABASE_URL:?DATABASE_URL is required}"; : "${JWT_SECRET:?JWT_SECRET is required}"
(( ${#JWT_SECRET} >= 32 )) || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
test -d node_modules || { echo 'Backend dependencies are missing; install them explicitly before starting' >&2; exit 1; }
backend_port="${BACKEND_PORT:-${SERVER_PORT:-4000}}"; frontend_port="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
for port in "$backend_port" "$frontend_port"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is already in use; no process was changed" >&2; exit 1; fi
done
mode="${1:-all}"; pids=(); trap 'for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done' EXIT INT TERM
if [[ "$mode" == backend || "$mode" == all ]]; then SERVER_PORT="$backend_port" CLIENT_PORT="$frontend_port" CLIENT_URL="http://127.0.0.1:$frontend_port" npm run server & pids+=("$!"); fi
if [[ "$mode" == frontend || "$mode" == all ]]; then
  if [[ -x client/node_modules/.bin/react-scripts ]]; then
    PORT="$frontend_port" REACT_APP_API_URL="http://127.0.0.1:$backend_port/api" BROWSER=none npm --prefix client start & pids+=("$!")
  elif [[ "$mode" == frontend ]]; then
    echo 'Frontend dependencies are missing; install them explicitly before starting' >&2; exit 1
  else
    echo 'Frontend dependencies are not installed; starting the API only.'
  fi
fi
[[ ${#pids[@]} -gt 0 ]] || { echo 'Usage: ./start.sh [all|backend|frontend]' >&2; exit 2; }
wait
