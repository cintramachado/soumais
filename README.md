# Soul+ Web

Aplicação responsiva Next.js com App Router, Supabase Auth SSR e suporte PWA.

## Requisitos

- Node.js 24 ou compatível com a versão atual do Next.js.
- npm.
- Supabase CLI e Docker Desktop para o ambiente local.

## Instalação

Dentro de `apps/web`:

```powershell
npm install
Copy-Item .env.example .env.local
```

Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`. A chave publicável pode estar visível no navegador; nunca use uma secret/service-role key nessas variáveis.

O banco local deste workspace é configurado em `../../supabase`. Na raiz do workspace:

```powershell
supabase start --exclude realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
supabase status
```

O cadastro público está desativado. Usuários devem ser provisionados por um processo administrativo confiável com papel em `app_metadata`; a migration cria `profiles` e exige um papel válido.

Para criar o primeiro professor no Supabase local, execute da raiz `./apps/web/scripts/provision-local-admin.ps1`. O script pede a chave Secret e a senha sem exibi-las nem gravá-las no repositório.

As migrations incluem `organizations` e `organization_memberships`. O workspace opera inicialmente com a organização `soulmais`; contas com mais de uma organização falham fechadas até existir seleção explícita. Turmas, anos letivos e períodos são filtrados por membership e RLS.

## Responsáveis

Em `Professor > Responsáveis`, cadastre nome/telefone, abra o cadastro e vincule alunos de suas turmas. A lista tem busca e paginação. Inativar o responsável bloqueia sua leitura dos alunos; remover um vínculo exige confirmação.

O cadastro de responsável pode existir sem login. Para liberar acesso, provisione uma conta pelo Auth Admin API e atribua `app_metadata.role=parent` (não `admin`). O perfil deve estar ativo na mesma organização. No cadastro do responsável, associe o email dessa conta e confirme a operação. Uma conta não pode ser associada a dois cadastros nem substituir uma conta já vinculada pela interface.

O dashboard do responsável oferece seleção dos alunos vinculados e dados cadastrais somente leitura. Tarefas e pontuação serão acrescentadas nas fases correspondentes. Professor só consulta vínculos de alunos de suas turmas; um responsável compartilhado pode ser editado pelos professores autorizados desses alunos.

As migrations 005/006/007 suportam provisionamento Auth em duas etapas, responsáveis e policies/RPCs de leitura/vínculo, incluindo matrículas dos alunos vinculados. Rode `supabase migration up --local` na raiz para aplicar mudanças sem resetar os dados.

## Desenvolvimento

```powershell
npm run dev
```

Abra `http://localhost:3000`. Sem variáveis Supabase, a aplicação mostra uma tela de configuração, sem simular login ou persistência.

## Qualidade

```powershell
npm run lint
npm test
npm run build
supabase test db
```

Gere os ícones após substituir o logo em `public/brand`:

```powershell
npm run icons:generate
```

## PWA e dados privados

O manifest define instalação standalone e ícones 192/512. O service worker só é registrado em produção, guarda assets estáticos versionados e ícones e mostra uma página offline neutra em falhas de navegação. Páginas autenticadas, APIs e respostas Supabase não entram em cache; offline não salva alterações.

## Estrutura

- `src/app/`: rotas, layouts, manifest e callback Auth.
- `src/features/`: componentes organizados por domínio.
- `src/lib/`: Supabase SSR, autenticação e validações.
- `public/sw.js`: cache estático limitado e fallback offline.
- `../../supabase/migrations/`: migrations compartilhadas do workspace.
