# Soul+ Server Deployment

This deployment uses the official Supabase self-hosted Docker Compose stack, its Logs/Analytics override, and layers the Soul+ web app into the same Compose project. PostgreSQL, Auth, REST, Realtime, Storage, image proxy, Studio, Edge Runtime, Supavisor, Logflare, and Vector run together. Only the Soul+ web port is published; the API gateway and database pooler stay internal to Docker.

## Prerequisites

- A new Linux server with Docker Engine and Docker Compose v2.24 or newer.
- At least 8 GB RAM and 80 GB SSD recommended for the full stack with Logs/Analytics enabled.
- The complete Soul+ workspace on the server, with `apps/web` and `supabase/migrations` preserved in their current relative locations.
- The ngrok domain forwarded from the ngrok machine to the Linux server's reachable IP on TCP port 3002. Do not point the remote ngrok client to its own `localhost`.

## Install Supabase

On the Linux server, from the Soul+ workspace root, install the official self-hosted stack into `deploy/supabase`:

```sh
curl -fsSL https://supabase.link/setup.sh | sh -s -- --project-dir deploy/supabase
```

Review `deploy/supabase/.env` before starting the stack. Set the public app origin and Auth callback URLs:

```dotenv
SUPABASE_PUBLIC_URL=https://corymblike-prohibitively-wilma.ngrok-free.dev
API_EXTERNAL_URL=https://corymblike-prohibitively-wilma.ngrok-free.dev/auth/v1
SITE_URL=https://corymblike-prohibitively-wilma.ngrok-free.dev
ADDITIONAL_REDIRECT_URLS=https://corymblike-prohibitively-wilma.ngrok-free.dev/**,http://localhost:3002/**
```

The setup script generates database/API secrets. Set the SMTP values in `.env` to use the Gmail app password:

```dotenv
SMTP_ADMIN_EMAIL=soulmaisespacoalpha@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=soulmaisespacoalpha@gmail.com
SMTP_PASS=<senha-de-app-do-gmail>
SMTP_SENDER_NAME=Soul+
```

Enter the 16-character Google app password directly in the server's private `.env`; do not commit or send it in chat. The overlay removes host port mappings for both the API gateway and Supavisor, so they are reachable only on the Compose network. Browser requests use the ngrok origin and Next.js proxies them to the internal gateway.

## Deploy

From `apps/web/deploy`, run:

```sh
bash deploy.sh
```

The script starts the full Supabase stack, applies numbered migrations from `supabase/migrations` once (each migration and its ledger entry are transactional), then builds and starts Soul+ on port 3002. The container is detached and persists after the SSH session closes.

Check services and logs:

```sh
cd deploy/supabase
docker compose --env-file .env \
	-f docker-compose.yml \
	-f docker-compose.logs.yml \
	-f ../../apps/web/deploy/compose.app.yaml ps
docker compose --env-file .env \
	-f docker-compose.yml \
	-f docker-compose.logs.yml \
	-f ../../apps/web/deploy/compose.app.yaml logs -f web
```

On the separate ngrok machine, forward to the Linux server's reachable LAN/VPN address, for example `ngrok http http://192.168.1.50:3002`. Do not use `localhost` on the ngrok machine. Allow inbound TCP 3002 from that machine; do not expose the Supabase gateway, Studio, Postgres, or pooler publicly.

For production, replace the temporary ngrok origin with a stable HTTPS domain and update `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, and `ADDITIONAL_REDIRECT_URLS` before starting the stack.