import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SchoolLoadError, formatDatePtBr } from '@/features/school/components/school-empty-state';
import { requireProfile } from "@/lib/auth/profile";

export default async function ParentDashboardPage({ searchParams }: { searchParams: Promise<{ student?: string; page?: string }> }) {
  await requireProfile("parent");
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? '1') || 1));
  const client = await createClient();
  const { data, error, count } = await client.from('parent_students')
    .select('student_id,relationship_type,students!inner(id,name,birth_date,active)', { count: 'exact' })
    .order('student_id').range((page - 1) * 20, page * 20 - 1);
  if (error) return <SchoolLoadError />;
  const children = (data ?? []).map((link) => ({
    relationship: link.relationship_type,
    student: link.students as unknown as { id: string; name: string; birth_date: string; active: boolean },
  }));
  const selected = children.find((child) => child.student.id === params.student) ?? children[0];
  return <div className="space-y-6"><header className="border-b pb-5"><h1 className="text-2xl font-semibold">Meus alunos</h1></header>
    {!selected ? <p className="py-8 text-sm text-muted-foreground">Nenhum aluno vinculado ao seu acesso.</p> : <>
      <form className="flex flex-wrap items-end gap-3"><input type="hidden" name="page" value={page} /><div className="min-w-0 flex-1"><label htmlFor="child-selector" className="mb-2 block text-sm font-medium">Aluno</label><select id="child-selector" name="student" defaultValue={selected.student.id} className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm">{children.map((child) => <option key={child.student.id} value={child.student.id}>{child.student.name}</option>)}</select></div><button className="min-h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground">Consultar</button></form>
      <section aria-label="Dados do aluno" className="space-y-3 border-y py-6"><h2 className="break-words text-xl font-semibold">{selected.student.name}</h2><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Nascimento</dt><dd>{formatDatePtBr(selected.student.birth_date)}</dd></div><div><dt className="text-sm text-muted-foreground">Vínculo</dt><dd>{selected.relationship}</dd></div><div><dt className="text-sm text-muted-foreground">Situação</dt><dd>{selected.student.active ? 'Ativo' : 'Inativo'}</dd></div></dl></section>
    </>}
    <nav aria-label="Paginação de alunos" className="flex justify-between text-sm">{page > 1 ? <Link href={`?page=${page - 1}`}>Anterior</Link> : <span />}{page * 20 < (count ?? 0) && <Link href={`?page=${page + 1}`}>Próxima</Link>}</nav>
  </div>;
}