import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { ParentForm } from '@/features/parents/components/parent-form';
import { ParentLinks, type ParentLink } from '@/features/parents/components/parent-links';
import { ParentAccount } from '@/features/parents/components/parent-account';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function ParentDetailPage({ params, searchParams }: { params: Promise<{ parentId: string }>; searchParams: Promise<{ q?: string; page?: string; linksPage?: string }> }) {
  await requireProfile('teacher');
  const { parentId } = await params;
  if (!z.uuid().safeParse(parentId).success) notFound();
  const search = await searchParams;
  const queryText = (search.q ?? '').slice(0, 120).replace(/[%_]/g, '');
  const page = Math.max(1, Math.min(10000, Number.parseInt(search.page ?? '1') || 1));
  const linksPage = Math.max(1, Math.min(10000, Number.parseInt(search.linksPage ?? '1') || 1));
  const client = await createClient();
  let studentsQuery = client.from('students').select('id,name', { count: 'exact' }).eq('active', true).order('name').order('id');
  if (queryText) studentsQuery = studentsQuery.ilike('name', `%${queryText}%`);
  const [parentResult, studentsResult, linksResult] = await Promise.all([
    client.from('parents').select('id,name,phone,active,profile_id').eq('id', parentId).maybeSingle(),
    studentsQuery.range((page - 1) * 20, page * 20 - 1),
    client.from('parent_students').select('student_id,relationship_type,students!inner(id,name)', { count: 'exact' }).eq('parent_id', parentId).order('student_id').range((linksPage - 1) * 20, linksPage * 20 - 1),
  ]);
  if (parentResult.error || studentsResult.error || linksResult.error) return <SchoolLoadError />;
  if (!parentResult.data) notFound();
  const parent = parentResult.data;
  const url = (studentPage: number, linkPage: number) => `?${new URLSearchParams({ q: queryText, page: String(studentPage), linksPage: String(linkPage) })}`;
  return <div className="space-y-8">
    <header className="border-b pb-5"><Link href="/teacher/parents" className="inline-block py-2 text-sm text-primary">Voltar aos responsáveis</Link><h1 className="mt-2 break-words text-2xl font-semibold">{parent.name}</h1></header>
    <section className="space-y-4 border-b pb-6"><h2 className="text-lg font-semibold">Cadastro</h2><ParentForm parent={parent} /></section>
    <section className="space-y-4 border-b pb-6"><h2 className="text-lg font-semibold">Alunos vinculados</h2>
      <form className="flex gap-2"><label htmlFor="student-search" className="sr-only">Buscar aluno para vínculo</label><input id="student-search" name="q" defaultValue={queryText} placeholder="Buscar aluno por nome" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm" /><button className="rounded-md border bg-white px-3 text-sm">Buscar</button></form>
      <ParentLinks parentId={parentId} active={parent.active} students={studentsResult.data ?? []} links={(linksResult.data ?? []) as unknown as ParentLink[]} />
      <nav aria-label="Paginação de alunos disponíveis" className="flex justify-between text-sm">{page > 1 ? <Link href={url(page - 1, linksPage)}>Alunos anteriores</Link> : <span />}{page * 20 < (studentsResult.count ?? 0) && <Link href={url(page + 1, linksPage)}>Mais alunos</Link>}</nav>
      <nav aria-label="Paginação de vínculos" className="flex justify-between text-sm">{linksPage > 1 ? <Link href={url(page, linksPage - 1)}>Vínculos anteriores</Link> : <span />}{linksPage * 20 < (linksResult.count ?? 0) && <Link href={url(page, linksPage + 1)}>Mais vínculos</Link>}</nav>
    </section>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Conta de acesso</h2>{parent.profile_id ? <p className="text-sm text-muted-foreground">Conta associada a este cadastro.</p> : <ParentAccount parentId={parentId} />}</section>
  </div>;
}