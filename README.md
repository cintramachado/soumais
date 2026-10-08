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

O banco local e suas migrations ficam em `supabase/`, dentro deste repositório. Execute os comandos a partir da raiz do repositório:

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

## Indicadores do dashboard

A Visão geral do professor mostra alunos ativos das turmas autorizadas, tarefas abertas, pendências e aproveitamento. Os pontos incluem ajustes manuais e excluem tarefas canceladas. Alunos em múltiplos grupos não são contados em duplicidade. Sem turma selecionada, a base inclui todos os anos letivos ativos da organização.

Os números são consultados na abertura/retorno ao dashboard e ao voltar à aba do navegador, sem atualização periódica. O botão de atualizar permite consulta manual. A API usa `private, no-store` e verifica a autorização por turma. Migration: 019.

## Tarefas

Em `Tipos de tarefa`, cadastre a pontuação padrão. Em `Tarefas`, crie um rascunho com tipo, período, datas, pontuação máxima e destinos: turma inteira, grupos ou alunos específicos. Destinos podem se sobrepor: cada aluno recebe somente uma atribuição. A busca de destinos é paginada e consulta apenas turmas autorizadas do ano letivo do período.

Salve o rascunho e publique pelo detalhe da tarefa. A publicação é transacional, exige ao menos um aluno ativo, registra auditoria e materializa `student_tasks`. Publicar novamente não recalcula os destinatários nem duplica registros. Alterações posteriores de matrícula/grupo não mudam o snapshot. As datas da tarefa devem estar dentro do período escolhido.

Somente o criador pode gerenciar suas tarefas, e ele deve continuar autorizado nas turmas dos destinos. Perder o vínculo docente bloqueia leitura e alteração. Rascunhos são editáveis; tarefas publicadas podem ser encerradas ou canceladas com confirmação, preservando as atribuições. Tipos/políticas são isolados por organização. A política padrão usa o multiplicador configurado no banco; o motor de pontuação e o lançamento dos resultados pertencem às fases seguintes.

Migrations desta etapa: 008 (tarefas/publicação), 009 (filtros paginados), 010 (revogação de escopo) e 011 (constraints de entrada). Nenhum seed de produção ou mock é utilizado nos cadastros.

```powershell
npm run dev
```

Abra `http://localhost:3000`. Sem variáveis Supabase, a aplicação mostra uma tela de configuração, sem simular login ou persistência.

## Qualidade

## Professores, grupos e relatório PDF

No menu `Professores`, cadastre nome, email e telefone e abra o cadastro para vincular turmas sob sua administração. O vínculo concede acesso à turma inteira depois de a conta estar provisionada e ativa; toda inclusão/remoção de vínculo exige confirmação. O cadastro sozinho não cria login nem armazena senha. Provisione a conta pelo Auth Admin API com papel `teacher` e o mesmo email: o registro docente existente será reutilizado. Inativar um professor vinculado bloqueia o perfil e suas permissões.

Em `Turmas e alunos > Abrir turma > Grupos > Editar`, selecione o professor responsável. Só docentes ativos vinculados àquela turma são aceitos, com validação no PostgreSQL. O nome aparece na lista de grupos. Remova ou troque a responsabilidade dos grupos antes de retirar o vínculo do professor à turma.

O dashboard do professor oferece `Gerar relatório`. Selecione turma e, opcionalmente, período e grupo. O PDF consolida a matrícula e os grupos atuais, os docentes da turma, o responsável de cada grupo e os pontos vigentes de cada aluno. Ajustes manuais prevalecem; tarefas canceladas são excluídas. O total inclui resultados de todos os docentes para os alunos/ano letivo selecionados, não apenas tarefas criadas pelo solicitante. A consulta valida o acesso à turma e usa um snapshot consistente.

O PDF usa fontes locais, tabela multipágina, data de emissão e identificação do emissor. É gerado em memória, retornado com `private, no-store` e não é salvo no servidor ou cache PWA. Limite: 1.000 alunos por emissão; use filtro de grupo para turmas maiores. O arquivo baixado contém dados de alunos e deve ser compartilhado apenas com pessoas autorizadas.

Migrations: 014 (snapshot do relatório), 015/016 (cadastro e escopo docente), 017 (responsável do grupo) e 018 (docentes dos grupos no relatório).

## Pontuação e histórico

No detalhe de uma tarefa publicada, clique no aluno atribuído para registrar o resultado, ajustar a pontuação ou consultar o histórico. Resultados de tarefas ativas ou encerradas podem ser corrigidos; tarefas canceladas mantêm o histórico, mas não permitem lançamentos nem entram nas métricas.

No prazo concede 100% do máximo, atraso usa a política associada à tarefa e não realizada/pendente concede zero. Ajuste manual prevalece, inclusive quando é zero, e deve ficar entre zero e o máximo da tarefa. Adicionar, alterar ou remover o ajuste exige motivo. A data de realização deve ser coerente com a situação escolhida e é armazenada como meia-noite no fuso da organização. O cálculo usa duas casas decimais e arredondamento half-up.

Em `Regras de pontos`, configure o percentual concedido em atraso para novas tarefas. Uma nova versão é criada; tarefas existentes (inclusive rascunhos) continuam usando a política anterior. Não há recálculo silencioso de resultados passados.

As migrations 012/013 implementam cálculo, RPCs com locks, histórico append-only e métricas sob RLS. Totais por aluno/tarefa/período, aproveitamento e pendências são agregados dinamicamente. Percentuais de realização/no prazo usam todas as atribuições válidas como denominador, e bases vazias retornam zero. Lançamento rápido em lote pertence à próxima fase.

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
- `supabase/migrations/`: migrations versionadas junto da aplicação.
