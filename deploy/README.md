# Soul+ Stack Automation with Supabase CLI

This setup uses `supabase start` to launch the full local-development Supabase stack (Postgres, Auth, REST, Realtime, Storage, Studio, Edge Runtime, and the CLI development tools). A separate Docker Compose service runs the Soul+ Next.js app. The startup scripts apply pending migrations before starting the app.

## Requirements

- Docker Engine/Desktop and Docker Compose v2.24 or newer.
- Supabase CLI installed and available as `supabase`.
- `jq` on Linux for safely reading CLI-generated keys without printing them.
- At least 8 GB RAM and 40 GB free disk for the full CLI stack.
- The complete workspace, preserving `apps/web` beside `supabase/migrations`.

## Start on Windows

From the workspace root or `apps/web`, run:

```powershell
npm run start:stack
```

It starts all CLI services, runs `supabase migration up --local`, then builds and starts the app container at `http://localhost:3002`. If the CLI Auth container does not already hold the Gmail app password, the script prompts for it with hidden input.

## Start on the Linux server

Copy the complete workspace to the Linux host. From the workspace root, run:

```sh
bash apps/web/deploy/deploy.sh
```

The script starts the Supabase CLI stack, applies pending migrations, reads `PUBLISHABLE_KEY` and `SECRET_KEY` from `supabase status --output json` without displaying them, builds the app image, and starts Soul+ on host port 3002. It asks for the public origin and Gmail app password if they are not set in the shell. The app uses Linux host networking to reach the CLI API at `127.0.0.1:54321`; the API and Postgres ports are not exposed to the network.

The CLI stack runs its full set of Docker services independently of the app Compose service. To inspect or stop them, use `supabase status` and `supabase stop`. To inspect or stop the app container:

```sh
docker compose --project-name soulmais-cli -f apps/web/deploy/compose.cli.yaml ps
docker compose --project-name soulmais-cli -f apps/web/deploy/compose.cli.yaml logs -f web
docker compose --project-name soulmais-cli -f apps/web/deploy/compose.cli.yaml down
```

## Ngrok from another machine

Forward ngrok to the Linux host's reachable LAN/VPN address, not to the ngrok machine's own `localhost`:

```sh
ngrok http http://<linux-host-ip>:3002
```

Allow inbound TCP 3002 from the ngrok machine. Keep Supabase API, Studio, Postgres, and pooler ports closed to external networks. The public origin used at startup must be present in `supabase/config.toml` under `auth.additional_redirect_urls`.

## Important

The Supabase CLI stack is intended for local development and testing, not a supported production hosting service. Running it on a server does not make it production-supported. For production or sensitive data, use the official Supabase self-hosted Compose distribution, stable HTTPS, firewall restrictions, automated backups, and a documented upgrade procedure.