#!/usr/bin/env bash
set -euo pipefail

web_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
workspace_dir=$(cd -- "$web_dir/../.." && pwd)
cd "$workspace_dir"

for command in supabase docker jq; do
  command -v "$command" >/dev/null 2>&1 || { echo "Required command missing: $command" >&2; exit 1; }
done

public_origin=${SOULMAIS_PUBLIC_ORIGIN:-}
if [[ -z "$public_origin" ]]; then
  read -r -p 'Public app origin (ngrok/domain): ' public_origin
fi
public_origin=${public_origin%/}
[[ "$public_origin" =~ ^https?://[^/]+$ ]] || { echo "Invalid public origin: $public_origin" >&2; exit 1; }

smtp_password=${SOULMAIS_GMAIL_APP_PASSWORD:-}
if [[ -z "$smtp_password" ]]; then
  read -r -s -p 'Gmail app password (16 characters): ' smtp_password
  printf '\n'
fi
smtp_password=${smtp_password//[[:space:]]/}
[[ ${#smtp_password} -eq 16 ]] || { echo 'Gmail app password must be 16 characters.' >&2; exit 1; }

export SOULMAIS_PUBLIC_ORIGIN="$public_origin"
export SOULMAIS_GMAIL_APP_PASSWORD="$smtp_password"
export SOULMAIS_SMTP_USER=${SOULMAIS_SMTP_USER:-soulmaisespacoalpha@gmail.com}
export SOULMAIS_EMAIL_DELIVERY_MODE=direct
export NODE_USE_SYSTEM_CA=1
export NEXT_PUBLIC_SITE_URL="$public_origin"
export NEXT_PUBLIC_SUPABASE_URL="$public_origin"
export SUPABASE_URL_INTERNAL=http://127.0.0.1:54321
export SUPABASE_PROXY_PATHS=true
export SOULMAIS_WEB_DIR="$web_dir"

cleanup() {
  unset SOULMAIS_GMAIL_APP_PASSWORD SUPABASE_SECRET_KEY NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
}
trap cleanup EXIT

run_supabase() {
  local output
  if ! output=$(supabase "$@" 2>&1); then
    printf '%s\n' "$output" | sed -E 's/sb_(secret|publishable)_[A-Za-z0-9_-]+/<redacted>/g' >&2
    return 1
  fi
}

echo 'Starting the Supabase CLI stack...'
run_supabase start
echo 'Applying pending database migrations...'
run_supabase migration up --local

status_json=$(supabase status --output json)
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(jq -er '.PUBLISHABLE_KEY' <<<"$status_json")
export SUPABASE_SECRET_KEY=$(jq -er '.SECRET_KEY' <<<"$status_json")

docker compose --project-name soulmais-cli -f "$web_dir/deploy/compose.cli.yaml" up -d --build --wait
echo "Soul+ is running at $public_origin (host port 3002)."