#!/usr/bin/env bash
set -euo pipefail

web_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
workspace_dir=$(cd -- "$web_dir/../.." && pwd)
supabase_dir=${SUPABASE_PROJECT_DIR:-"$workspace_dir/deploy/supabase"}

if [[ ! -f "$supabase_dir/docker-compose.yml" || ! -f "$supabase_dir/.env" ]]; then
  echo "Self-hosted Supabase is missing at $supabase_dir." >&2
  echo "Install the official Supabase Docker stack there before deploying Soul+." >&2
  exit 1
fi
if [[ ! -f "$supabase_dir/docker-compose.logs.yml" ]]; then
  echo "The official Supabase Logs/Analytics Compose override is missing." >&2
  exit 1
fi

export SOULMAIS_WEB_DIR="$web_dir"
export SOULMAIS_MIGRATIONS_DIR="$workspace_dir/supabase/migrations"
if [[ ! -d "$SOULMAIS_MIGRATIONS_DIR" ]]; then
  echo "Migration directory is missing: $SOULMAIS_MIGRATIONS_DIR" >&2
  exit 1
fi

compose=(docker compose --env-file "$supabase_dir/.env" -f "$supabase_dir/docker-compose.yml" -f "$supabase_dir/docker-compose.logs.yml" -f "$web_dir/deploy/compose.app.yaml")

"${compose[@]}" up -d --wait
"${compose[@]}" --profile migrate run --rm soulmais-migrate
"${compose[@]}" --profile app up -d --build --wait web

echo "Soul+ is running on port 3002."