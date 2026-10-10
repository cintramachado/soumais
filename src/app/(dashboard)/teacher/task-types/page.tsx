import Link from 'next/link';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { TaskTypeForm } from '@/features/tasks/components/task-type-form';
import { DeleteTaskTypeButton } from '@/features/tasks/components/delete-task-type-button';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function TaskTypesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireProfile('teacher');
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? '1') || 1));
  const search = (params.q ?? '').slice(0, 120).replace(/[%_]/g, '');
  const client = await createClient();
  let query = client.from('task_types').select('id,name,description,default_score,active', { count: 'exact' }).order('name').order('id');
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query.range((page - 1) * 20, page * 20 - 1);
  const pageUrl = (value: number) => `?${new URLSearchParams({ q: search, page: String(value) })}`;
  return <div className="space-y-6"><header className="border-b pb-5"><h1 className="text-2xl font-semibold">Tipos de tarefa</h1></header>
    <details className="border-b pb-5"><summary className="w-fit cursor-pointer rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">Novo tipo</summary><div className="pt-5"><TaskTypeForm /></div></details>
    <form className="flex gap-2"><label className="sr-only" htmlFor="type-search">Buscar tipo</label><input id="type-search" name="q" defaultValue={search} placeholder="Buscar por nome" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm" /><button className="rounded-md border bg-white px-4 text-sm">Buscar</button></form>
    {error ? <SchoolLoadError /> : <div className="divide-y border-y bg-white">{data?.map((type) => <article key={type.id} className="space-y-3 p-4"><div><h2 className="break-words font-medium">{type.name}</h2><p className="text-sm text-muted-foreground">{type.default_score} pontos · {type.active ? 'Ativo' : 'Inativo'}</p>{type.description && <p className="mt-2 break-words text-sm">{type.description}</p>}</div><details><summary className="w-fit cursor-pointer py-2 text-sm text-primary">Editar tipo</summary><TaskTypeForm taskType={type} /></details><DeleteTaskTypeButton id={type.id} name={type.name} /></article>)}{!data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum tipo encontrado.</p>}</div>}
    <nav aria-label="Paginação de tipos" className="flex justify-between text-sm">{page > 1 ? <Link href={pageUrl(page - 1)}>Anterior</Link> : <span />}<span>Página {page}</span>{page * 20 < (count ?? 0) && <Link href={pageUrl(page + 1)}>Próxima</Link>}</nav>
  </div>;
}