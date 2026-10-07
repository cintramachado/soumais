#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists soulmais_deploy;
revoke all on schema soulmais_deploy from public, anon, authenticated;
create table if not exists soulmais_deploy.applied_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
revoke all on soulmais_deploy.applied_migrations from public, anon, authenticated;
SQL

for migration in /migrations/[0-9]*.sql; do
  [ -f "$migration" ] || continue
  filename=${migration##*/}
  version=${filename%%_*}
  applied=$(psql -At -v ON_ERROR_STOP=1 -c "select exists(select 1 from soulmais_deploy.applied_migrations where version='${version}')")
  if [ "$applied" = "t" ]; then
    echo "Already applied: $filename"
    continue
  fi

  echo "Applying: $filename"
  {
    cat "$migration"
    printf "\ninsert into soulmais_deploy.applied_migrations(version) values ('%s');\n" "$version"
  } | psql --single-transaction -v ON_ERROR_STOP=1
done

psql -v ON_ERROR_STOP=1 -c "notify pgrst, 'reload schema'"
echo "Soul+ migrations are up to date."