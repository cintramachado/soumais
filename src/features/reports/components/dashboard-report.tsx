import Link from 'next/link';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';
import { ReportForm } from './report-form';

export async function DashboardReport({ filters }: { filters: { reportClass?: string; classPage?: string } }) {
  const client = await createClient();
  const page = Math.max(1, Math.min(10000, Number.parseInt(filters.classPage ?? '1') || 1));
  const classes = await client.from('classes').select('id,name,school_year_id', { count: 'exact' }).order('name').order('id').range((page - 1) * 20, page * 20 - 1);
  if (classes.error) return <SchoolLoadError />;
  let selected = classes.data?.find((schoolClass) => schoolClass.id === filters.reportClass) ?? classes.data?.[0];
  if (filters.reportClass && z.uuid().safeParse(filters.reportClass).success && !classes.data?.some((schoolClass) => schoolClass.id === filters.reportClass)) {
    const requested = await client.from('classes').select('id,name,school_year_id').eq('id', filters.reportClass).maybeSingle();
    if (requested.data) selected = requested.data;
  }
  const options = [...(classes.data ?? [])];
  if (selected && !options.some((schoolClass) => schoolClass.id === selected.id)) options.push(selected);
  const [groups, periods] = selected ? await Promise.all([
    client.from('groups').select('id,name').eq('class_id', selected.id).order('name').limit(100),
    client.from('periods').select('id,name').eq('school_year_id', selected.school_year_id).order('start_date').limit(100),
  ]) : [null, null];
  return <section aria-labelledby="report-title" className="mt-8 space-y-5 border-y border-[#dce4de] py-6"><h2 id="report-title" className="text-xl font-semibold">Relatório de pontuação</h2>
    {!selected ? <p className="text-sm text-muted-foreground">Nenhuma turma disponível para relatório.</p> : <>
      <form action="/teacher" className="flex flex-wrap items-end gap-3"><input type="hidden" name="classPage" value={page} /><label className="min-w-0 flex-1 text-sm font-medium">Turma<select name="reportClass" defaultValue={selected.id} className="mt-2 h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm">{options.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label><button type="submit" className="min-h-10 rounded-md border bg-white px-4 text-sm">Selecionar turma</button></form>
      {groups?.error || periods?.error ? <SchoolLoadError /> : <ReportForm key={selected.id} classId={selected.id} groups={groups?.data ?? []} periods={periods?.data ?? []} />}
    </>}
    <nav aria-label="Paginação das turmas de relatório" className="flex justify-between text-sm">{page > 1 ? <Link href={`?classPage=${page - 1}`}>Turmas anteriores</Link> : <span />}{page * 20 < (classes.count ?? 0) && <Link href={`?classPage=${page + 1}`}>Mais turmas</Link>}</nav>
  </section>;
}