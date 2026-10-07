import Link from 'next/link';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { ParentForm } from '@/features/parents/components/parent-form';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function ParentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireProfile('teacher');
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? '1') || 1));
  const search = (params.q ?? '').slice(0, 120).replace(/[%_]/g, '');
  const client = await createClient();
  let query = client.from('parents').select('id,name,email,phone,active,profile_id', { count: 'exact' }).order('name').order('id');
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query.range((page - 1) * 20, page * 20 - 1);
  const pageUrl = (value: number) => `/teacher/parents?${new URLSearchParams({ q: search, page: String(value) })}`;
  return <div className="space-y-6">
    <header className="border-b pb-5"><h1 className="text-2xl font-semibold">Responsáveis</h1></header>
    <details className="border-b pb-5"><summary className="w-fit cursor-pointer rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">Cadastrar responsável</summary><div className="pt-5"><ParentForm /></div></details>
    <form className="flex gap-2"><label className="sr-only" htmlFor="parents-search">Buscar responsável</label><input id="parents-search" name="q" defaultValue={search} placeholder="Buscar por nome" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm" /><button className="rounded-md border bg-white px-4 text-sm">Buscar</button></form>
    {error ? <SchoolLoadError /> : <ul className="divide-y border-y bg-white">{data?.map((parent) => <li key={parent.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><Link className="break-words font-medium text-primary underline-offset-4 hover:underline" href={`/teacher/parents/${parent.id}`}>{parent.name}</Link><p className="mt-1 text-sm text-muted-foreground">{parent.phone || 'Sem telefone'} · {parent.active ? 'Ativo' : 'Inativo'}</p></div><Link className="shrink-0 rounded-md border px-3 py-2 text-sm" href={`/teacher/parents/${parent.id}`}>Abrir</Link></li>)}{!data?.length && <li className="p-8 text-center text-sm text-muted-foreground">Nenhum responsável encontrado.</li>}</ul>}
    <nav aria-label="Paginação de responsáveis" className="flex flex-wrap items-center justify-between gap-3 text-sm">{page > 1 ? <Link href={pageUrl(page - 1)}>Anterior</Link> : <span />}<span>Página {page}</span>{page * 20 < (count ?? 0) ? <Link href={pageUrl(page + 1)}>Próxima</Link> : <span />}</nav>
  </div>;
}