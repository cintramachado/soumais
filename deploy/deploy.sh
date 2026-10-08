#!/usr/bin/env bash
set -euo pipefail
umask 077

web_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
supabase_dir=${SUPABASE_PROJECT_DIR:?Set SUPABASE_PROJECT_DIR to the persistent self-hosted installation}
supabase_dir=$(cd -- "$supabase_dir" && pwd)
for command in docker flock gzip; do
  command -v "$command" >/dev/null || { echo "Missing command: $command" >&2; exit 1; }
done
for file in docker-compose.yml docker-compose.logs.yml .env; do
  [[ -f "$supabase_dir/$file" ]] || { echo "Missing Supabase installation file: $file" >&2; exit 1; }
done
[[ "$supabase_dir" != "$web_dir"/* ]] || { echo 'Keep production data outside the Actions checkout.' >&2; exit 1; }
exec 9>"$supabase_dir/.soulmais-deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }

export SOULMAIS_WEB_DIR="$web_dir"
unset COMPOSE_PROFILES
compose=(docker compose --env-file "$supabase_dir/.env" -f "$supabase_dir/docker-compose.yml" -f "$supabase_dir/docker-compose.logs.yml" -f "$web_dir/deploy/compose.app.yaml")
"${compose[@]}" --profile app --profile migrate config --quiet
"${compose[@]}" --profile app build web
"${compose[@]}" up -d --wait

mkdir -p "$supabase_dir/backups"
backup="$supabase_dir/backups/pre-migration-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
"${compose[@]}" exec -T db sh -c 'pg_dump -U postgres -d "$POSTGRES_DB"' | gzip > "$backup"
gzip -t "$backup"

"${compose[@]}" --profile migrate run --rm soulmais-migrate
"${compose[@]}" --profile app up -d --wait web
echo 'Self-hosted Supabase and Soul+ deployed on port 3002.'