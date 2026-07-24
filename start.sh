#!/usr/bin/env bash
set -euo pipefail
# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
if [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
else
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD
fi
unset demo_credentials_email demo_credentials_password demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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
if [[ "$mode" == backend || "$mode" == all ]]; then SERVER_PORT="$backend_port" CLIENT_PORT="$frontend_port" CLIENT_URL="http://127.0.0.1:$frontend_port" node server/index.js & pids+=("$!"); fi
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
