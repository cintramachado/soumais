import Link from 'next/link';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { TeacherForm } from '@/features/teachers/components/teacher-form';
import { DeleteTeacherButton } from '@/features/teachers/components/delete-teacher-button';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireProfile('teacher');
  const filters = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(filters.page ?? '1') || 1));
  const queryText = (filters.q ?? '').slice(0, 120).replace(/[%_]/g, '');
  const client = await createClient();
  let query = client.from('teachers').select('id,name,email,phone,active,profile_id', { count: 'exact' }).order('name').order('id');
  if (queryText) query = query.ilike('name', `%${queryText}%`);
  const { data, count, error } = await query.range((page - 1) * 20, page * 20 - 1);
  const url = (value: number) => `?${new URLSearchParams({ q: queryText, page: String(value) })}`;
  return <div className="space-y-6"><header className="border-b pb-5"><h1 className="text-2xl font-semibold">Professores</h1></header><details className="border-b pb-5"><summary className="w-fit cursor-pointer rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">Cadastrar professor</summary><div className="pt-5"><TeacherForm /></div></details>
    <form className="flex gap-2"><label htmlFor="teacher-search" className="sr-only">Buscar professor</label><input id="teacher-search" name="q" defaultValue={queryText} placeholder="Buscar por nome" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm" /><button className="rounded-md border bg-white px-4 text-sm">Buscar</button></form>
    {error ? <SchoolLoadError /> : <ul className="divide-y border-y bg-white">{data?.map((teacher) => <li key={teacher.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><Link href={`/teacher/teachers/${teacher.id}`} className="break-words font-medium text-primary">{teacher.name}</Link><p className="mt-1 break-all text-sm text-muted-foreground">{teacher.email}</p><p className="mt-1 text-xs text-muted-foreground">{teacher.active ? 'Ativo' : 'Inativo'} · {teacher.profile_id ? 'Conta vinculada' : 'Sem conta de login'}</p></div><div className="flex items-center gap-2"><Link href={`/teacher/teachers/${teacher.id}`} className="rounded-md border px-3 py-2 text-sm">Abrir cadastro</Link><DeleteTeacherButton id={teacher.id} name={teacher.name} /></div></li>)}{!data?.length && <li className="p-8 text-center text-sm text-muted-foreground">Nenhum professor encontrado.</li>}</ul>}
    <nav aria-label="Paginação de professores" className="flex justify-between text-sm">{page > 1 ? <Link href={url(page - 1)}>Anterior</Link> : <span />}<span>Página {page}</span>{page * 20 < (count ?? 0) && <Link href={url(page + 1)}>Próxima</Link>}</nav>
  </div>;
}