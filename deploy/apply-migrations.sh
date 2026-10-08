#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists soulmais_deploy;
revoke all on schema soulmais_deploy from public, anon, authenticated;
create table if not exists soulmais_deploy.applied_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
revoke all on soulmais_deploy.applied_migrations from public, anon, authenticated;
SQL

for migration in /migrations/[0-9]*.sql; do
  [ -f "$migration" ] || { echo 'No migration files found.' >&2; exit 1; }
  filename=${migration##*/}
  version=${filename%%_*}
  case "$version" in ''|*[!0-9]*) echo 'Invalid migration version.' >&2; exit 1;; esac
  checksum=$(sha256sum "$migration" | cut -d ' ' -f 1)
  stored=$(psql -At -v ON_ERROR_STOP=1 -c "select checksum from soulmais_deploy.applied_migrations where version='$version'")
  if [ -n "$stored" ]; then
    [ "$stored" = "$checksum" ] || { echo "Applied migration changed: $filename" >&2; exit 1; }
    continue
  fi
  echo "Applying: $filename"
  {
    printf 'select pg_advisory_xact_lock(721034982);\n'
    cat "$migration"
    printf "\ninsert into soulmais_deploy.applied_migrations(version,checksum) values ('%s','%s');\n" "$version" "$checksum"
  } | psql --single-transaction -v ON_ERROR_STOP=1
done
psql -v ON_ERROR_STOP=1 -c "notify pgrst, 'reload schema'"