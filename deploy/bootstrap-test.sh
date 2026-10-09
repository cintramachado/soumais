#!/usr/bin/env bash
set -euo pipefail
umask 077

public_origin=${1:?Pass the public origin, for example http://192.168.15.12:3002}
[[ "$public_origin" =~ ^https?://[A-Za-z0-9.:-]+$ ]] || { echo 'Invalid test origin.' >&2; exit 1; }
app_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
installation_dir=$(cd -- "$app_dir/.." && pwd)
supabase_dir="$installation_dir/supabase"
for command in git docker openssl jq curl; do
  command -v "$command" >/dev/null || { echo "Missing dependency: $command" >&2; exit 1; }
done
if [[ -e "$supabase_dir" ]]; then
  [[ "${2:-}" = '--resume' ]] || { echo 'Installation exists; use --resume to preserve its secrets.' >&2; exit 1; }
  [[ -f "$supabase_dir/.bootstrap-secrets.log" && -f "$supabase_dir/docker-compose.yml" ]] || {
    echo 'Existing directory is not a recognized bootstrap installation.' >&2
    exit 1
  }
  grep -Eq '^SUPABASE_SECRET_KEY=sb_secret_[A-Za-z0-9_-]+' "$supabase_dir/.env" || {
    echo 'Secret generation is incomplete. Nothing was overwritten.' >&2
    exit 1
  }
  cd "$supabase_dir"
  echo 'Resuming with previously generated secrets.'
else
  [[ -z "$(docker ps -a --filter name='^/supabase-' --format '{{.Names}}')" ]] || {
    echo 'Existing Supabase containers detected. Stop and review; no changes made.' >&2
    exit 1
  }
  git clone --filter=blob:none --no-checkout --depth=1 --branch self-hosted/v0.8.2 \
    https://github.com/supabase/supabase "$installation_dir/vendor"
  git -C "$installation_dir/vendor" sparse-checkout init --cone
  git -C "$installation_dir/vendor" sparse-checkout set docker
  git -C "$installation_dir/vendor" checkout --quiet
  cp -a "$installation_dir/vendor/docker" "$supabase_dir"
  chmod 700 "$supabase_dir"
  cp "$supabase_dir/.env.example" "$supabase_dir/.env"
  cd "$supabase_dir"

  sh utils/generate-keys.sh --update-env > "$supabase_dir/.bootstrap-secrets.log" 2>&1
  sh utils/add-new-auth-keys.sh --update-env >> "$supabase_dir/.bootstrap-secrets.log" 2>&1
  chmod 600 "$supabase_dir/.env" "$supabase_dir/.bootstrap-secrets.log"
fi

chmod 644 "$supabase_dir"/volumes/db/*.sql
smtp_password=$(sed -n 's/^SMTP_PASS=//p' .env | tail -n 1)
smtp_password=${smtp_password//[[:space:]]/}
if [[ ! "$smtp_password" =~ ^[A-Za-z0-9]+$ ]]; then
  read -r -s -p 'Gmail app password (hidden input): ' smtp_password < /dev/tty
  printf '\n'
  smtp_password=${smtp_password//[[:space:]]/}
fi
[[ "$smtp_password" =~ ^[A-Za-z0-9]+$ ]] || { echo 'SMTP_PASS must contain only letters and numbers.' >&2; exit 1; }
trap 'unset smtp_password' EXIT

set_env() {
  local key=$1 value=$2
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

set_env SUPABASE_PUBLIC_URL "$public_origin"
set_env API_EXTERNAL_URL "$public_origin/auth/v1"
set_env SITE_URL "$public_origin"
set_env ADDITIONAL_REDIRECT_URLS "$public_origin/**"
set_env DISABLE_SIGNUP true
set_env ENABLE_EMAIL_SIGNUP true
set_env ENABLE_EMAIL_AUTOCONFIRM false
set_env ENABLE_ANONYMOUS_USERS false
set_env ENABLE_PHONE_SIGNUP false
set_env OPENAI_API_KEY ''
set_env SMTP_HOST smtp.gmail.com
set_env SMTP_PORT 465
set_env SMTP_USER soulmaisespacoalpha@gmail.com
set_env SMTP_ADMIN_EMAIL soulmaisespacoalpha@gmail.com
set_env SMTP_PASS "$smtp_password"
set_env SMTP_SENDER_NAME Soul+
unset smtp_password
printf 'ref=self-hosted/v0.8.2\n' > .supabase-version

export SUPABASE_PROJECT_DIR="$supabase_dir"
bash "$app_dir/deploy/deploy.sh"