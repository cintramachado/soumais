import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { TeacherForm } from '@/features/teachers/components/teacher-form';
import { TeacherClasses } from '@/features/teachers/components/teacher-classes';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function TeacherDetailPage({ params, searchParams }: { params: Promise<{ teacherId: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireProfile('teacher');
  const { teacherId } = await params;
  if (!z.uuid().safeParse(teacherId).success) notFound();
  const filters = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(filters.page ?? '1') || 1));
  const search = (filters.q ?? '').slice(0, 120).replace(/[%_]/g, '');
  const client = await createClient();
  let classQuery = client.from('classes').select('id,name', { count: 'exact' }).eq('active', true).order('name').order('id');
  if (search) classQuery = classQuery.ilike('name', `%${search}%`);
  const [teacher, classes, assignments] = await Promise.all([
    client.from('teachers').select('id,name,email,phone,active,profile_id').eq('id', teacherId).maybeSingle(),
    classQuery.range((page - 1) * 20, page * 20 - 1),
    client.from('teacher_classes').select('class_id,classes!inner(id,name)').eq('teacher_id', teacherId).order('class_id').limit(100),
  ]);
  if (teacher.error || classes.error || assignments.error) return <SchoolLoadError />;
  if (!teacher.data) notFound();
  const linked = (assignments.data ?? []).map((row) => row.classes as unknown as { id: string; name: string });
  const url = (value: number) => `?${new URLSearchParams({ q: search, page: String(value) })}`;
  return <div className="space-y-7"><header className="border-b pb-5"><Link href="/teacher/teachers" className="inline-block py-2 text-sm text-primary">Voltar aos professores</Link><h1 className="mt-2 break-words text-2xl font-semibold">{teacher.data.name}</h1><p className="mt-2 text-sm text-muted-foreground">{teacher.data.profile_id ? 'Conta de acesso vinculada' : 'Cadastro sem conta de login'}</p></header>
    <section className="border-b pb-6"><TeacherForm teacher={teacher.data} /></section>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Turmas sob responsabilidade</h2><form className="flex gap-2"><label htmlFor="teacher-class-search" className="sr-only">Buscar turma disponível</label><input id="teacher-class-search" name="q" defaultValue={search} placeholder="Buscar turma" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm" /><button className="rounded-md border bg-white px-4 text-sm">Buscar</button></form><TeacherClasses teacherId={teacherId} active={teacher.data.active} classes={classes.data ?? []} linked={linked} /><nav aria-label="Paginação das turmas disponíveis" className="flex justify-between text-sm">{page > 1 ? <Link href={url(page - 1)}>Anterior</Link> : <span />}{page * 20 < (classes.count ?? 0) && <Link href={url(page + 1)}>Mais turmas</Link>}</nav></section>
  </div>;
}