# Deploy e GitHub Actions

Producao usa Supabase self-hosted oficial com Docker Compose. A CLI fica somente para desenvolvimento local e para testes descartaveis no CI. Nao e necessario usar Supabase Cloud.

## Pipeline

- `.github/workflows/ci.yml`: push em `master`/`main`, pull requests e execucao manual. Executa lint, testes web, build Next/Docker e migrations/testes SQL num Supabase CLI descartavel.
- `.github/workflows/deploy.yml`: depois do CI aprovado num push em `master`/`main`, ou manualmente com confirmacao `DEPLOY`. A implantacao e desativada por padrao.
- Configure a variavel de repositorio `PRODUCTION_DEPLOY_ENABLED=true` somente quando a infraestrutura estiver pronta.
- Crie o environment `production`, restrinja-o a `master`/`main` e configure aprovacao obrigatoria.
- Instale um runner GitHub Actions Linux dedicado com label `soulmais-production`. Nunca execute jobs de pull requests nesse runner. Ele precisa de Docker Compose, GitHub CLI (`gh`), Bash, `flock` e `gzip`.
- Configure a variavel do environment `SUPABASE_PROJECT_DIR` apontando para a instalacao persistente, fora do checkout do runner, por exemplo `/var/lib/soulmais/supabase`.

O deploy faz checkout do commit aprovado, constroi a imagem da app, inicia a stack oficial, salva um backup PostgreSQL, aplica migrations pendentes e inicia a app. Nao faz reset, nao apaga volumes e nao atualiza silenciosamente as versoes Supabase.

## Preparacao da infraestrutura

Nenhum comando abaixo foi executado num servidor remoto. Docker Engine e Compose devem ser disponibilizados pela infraestrutura. Para a primeira instalacao, use a release oficial validada `self-hosted/v0.8.2`; mantenha os arquivos oficiais e segredos fora do checkout de Actions.

```sh
# Execute em um diretorio persistente previamente autorizado pela infraestrutura.
curl -fsSL https://raw.githubusercontent.com/supabase/supabase/self-hosted/v0.8.2/docker/setup.sh -o setup-supabase.sh
# Revise o script antes de executar. --skip-deps exige Docker e dependencias instalados.
sh setup-supabase.sh --skip-deps --ref self-hosted/v0.8.2 --project-dir supabase
```

O bootstrap gera as chaves; configure o `.env` privado na instalacao Supabase antes do primeiro deploy. Nao reutilize as chaves de desenvolvimento nem os exemplos oficiais. Restrinja permissoes com `chmod 600 .env`.

```dotenv
SUPABASE_PUBLIC_URL=https://corymblike-prohibitively-wilma.ngrok-free.dev
API_EXTERNAL_URL=https://corymblike-prohibitively-wilma.ngrok-free.dev/auth/v1
SITE_URL=https://corymblike-prohibitively-wilma.ngrok-free.dev
ADDITIONAL_REDIRECT_URLS=https://corymblike-prohibitively-wilma.ngrok-free.dev/**
DISABLE_SIGNUP=true
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
ENABLE_ANONYMOUS_USERS=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=soulmaisespacoalpha@gmail.com
SMTP_ADMIN_EMAIL=soulmaisespacoalpha@gmail.com
SMTP_SENDER_NAME=Soul+
```

Preencha `SMTP_PASS` diretamente no servidor ou em um gerenciador de segredos. Nao envie essa senha pelo chat nem a inclua no Git. O SMTP de producao e enviado pelo Auth; a app nao recebe a senha Gmail.

## Compose de producao

`compose.app.yaml` complementa os arquivos oficiais `docker-compose.yml` e `docker-compose.logs.yml`. Mantem PostgreSQL, Auth, REST, Realtime, Storage, imgproxy, Studio, Edge Runtime, Supavisor, Logflare e Vector. Remove as portas publicadas pelo gateway/pooler e publica apenas a app em `3002`.

As migrations de `supabase/migrations` ficam no mesmo Git da app. O migrador registra versao e checksum, recusa alteracao de migration ja aplicada e executa cada migration em transacao. Antes de aplica-las, `deploy.sh` salva um backup em `SUPABASE_PROJECT_DIR/backups`. Backups sao dados sensiveis: configure retencao e copia criptografada fora do servidor. O script nao executa rollback de schema automaticamente.

```sh
# Alternativa manual ao Actions, quando autorizado:
SUPABASE_PROJECT_DIR=/var/lib/soulmais/supabase bash deploy/deploy.sh
```

Use pelo menos Compose 2.24 com suporte a `!reset`, e reserve cerca de 8 GB RAM e 80 GB SSD para a stack completa. O servidor deve permanecer ligado; suspendê-lo interrompe o acesso.

## Acesso publico

O ngrok da outra maquina deve encaminhar para o IP LAN/VPN do servidor na porta `3002`, nao para o localhost da maquina do ngrok. Auth/REST passam pelo proxy Next, mas o gateway nao tem porta propria publicada. Isso nao torna a API inacessivel pelo app: ela continua protegida por autenticacao e RLS. Studio e PostgreSQL nao sao publicados.

Use um dominio HTTPS estavel para producao. Quando alterar a origem publica, atualize as URLs do `.env` e reconstrua a app, pois `NEXT_PUBLIC_*` e incorporado no build. Testes autenticados de login, convite, recuperacao, relatorios e perfis sao obrigatorios antes de liberar usuarios reais.

### Links de convite (APP_URL)

Os links de convite/recuperacao de senha enviados por email (`redirectTo` do Supabase Auth) sao montados pela app a partir de `APP_URL` (preferida) ou `NEXT_PUBLIC_SITE_URL` (nome legado, mantido por compatibilidade com os compose files existentes). Nunca sao derivados dos cabecalhos `Host`/`X-Forwarded-Host` da requisicao, para que um convite nao possa ser forjado para apontar para outro dominio.

- Defina `APP_URL` (ou `NEXT_PUBLIC_SITE_URL`) com a URL publica estavel, por exemplo `https://corymblike-prohibitively-wilma.ngrok-free.dev`.
- Diferente das variaveis `NEXT_PUBLIC_*`, `APP_URL` e lida em tempo de execucao no servidor: basta atualizar a variavel de ambiente e reiniciar o container (`docker compose up -d`), sem necessidade de reconstruir a imagem.
- Em producao, se nenhuma das duas variaveis estiver configurada, a geracao do link falha explicitamente em vez de usar um endereco local invalido.

## Desenvolvimento local

Na raiz do repositorio (`apps/web` nesta maquina), use `npm run start:stack`. Os scripts PowerShell usam a Supabase CLI local e o Compose de desenvolvimento. `compose.cli.yaml` e somente uma alternativa de desenvolvimento Linux; o workflow de producao nao o utiliza.