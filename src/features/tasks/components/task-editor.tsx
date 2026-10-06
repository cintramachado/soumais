import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';
import { TaskForm } from './task-form';
import { type Selection } from './task-recipients';
import { type TaskDraftValues } from '../schemas';

export async function TaskEditor({ draft, selection, filters = {} }: { draft?: TaskDraftValues; selection?: Selection; filters?: { typeQ?: string; periodQ?: string; typePage?: string; periodPage?: string } }) {
  const client = await createClient();
  const typeQ = (filters.typeQ ?? '').slice(0, 120).replace(/[%_]/g, '');
  const periodQ = (filters.periodQ ?? '').slice(0, 120).replace(/[%_]/g, '');
  const typePage = Math.max(1, Math.min(10000, Number.parseInt(filters.typePage ?? '1') || 1));
  const periodPage = Math.max(1, Math.min(10000, Number.parseInt(filters.periodPage ?? '1') || 1));
  let typeQuery = client.from('task_types').select('id,name,default_score', { count: 'exact' }).eq('active', true).order('name').order('id');
  let periodQuery = client.from('periods').select('id,name,start_date,end_date', { count: 'exact' }).eq('active', true).order('start_date', { ascending: false }).order('id');
  if (typeQ) typeQuery = typeQuery.ilike('name', `%${typeQ}%`);
  if (periodQ) periodQuery = periodQuery.ilike('name', `%${periodQ}%`);
  const [types, periods] = await Promise.all([typeQuery.range((typePage - 1) * 20, typePage * 20 - 1), periodQuery.range((periodPage - 1) * 20, periodPage * 20 - 1)]);
  if (types.error || periods.error) return <SchoolLoadError />;
  const typeOptions = [...(types.data ?? [])];
  const periodOptions = [...(periods.data ?? [])];
  if (draft && !typeOptions.some((type) => type.id === draft.taskTypeId)) {
    const current = await client.from('task_types').select('id,name,default_score').eq('id', draft.taskTypeId).maybeSingle();
    if (current.data) typeOptions.push(current.data);
  }
  if (draft && !periodOptions.some((period) => period.id === draft.periodId)) {
    const current = await client.from('periods').select('id,name,start_date,end_date').eq('id', draft.periodId).maybeSingle();
    if (current.data) periodOptions.push(current.data);
  }
  const filterUrl = (nextType: number, nextPeriod: number) => `?${new URLSearchParams({ typeQ, periodQ, typePage: String(nextType), periodPage: String(nextPeriod) })}`;
  return <div className="space-y-6">
    <details className="border-b pb-4"><summary className="w-fit cursor-pointer py-2 text-sm text-primary">Filtrar tipos e períodos</summary>
      <form className="grid gap-3 py-3 sm:grid-cols-2"><label className="text-sm">Tipo<input name="typeQ" defaultValue={typeQ} className="mt-1 h-10 w-full rounded-md border bg-white px-3" /></label><label className="text-sm">Período<input name="periodQ" defaultValue={periodQ} className="mt-1 h-10 w-full rounded-md border bg-white px-3" /></label><button className="min-h-10 w-fit rounded-md border bg-white px-4 text-sm">Filtrar</button></form>
      <nav aria-label="Paginação de tipos disponíveis" className="flex flex-wrap gap-4 py-2 text-sm">{typePage > 1 && <Link href={filterUrl(typePage - 1, periodPage)}>Tipos anteriores</Link>}{typePage * 20 < (types.count ?? 0) && <Link href={filterUrl(typePage + 1, periodPage)}>Mais tipos</Link>}</nav>
      <nav aria-label="Paginação de períodos disponíveis" className="flex flex-wrap gap-4 py-2 text-sm">{periodPage > 1 && <Link href={filterUrl(typePage, periodPage - 1)}>Períodos anteriores</Link>}{periodPage * 20 < (periods.count ?? 0) && <Link href={filterUrl(typePage, periodPage + 1)}>Mais períodos</Link>}</nav>
    </details>
    {!typeOptions.length || !periodOptions.length ? <div className="space-y-3 text-sm text-muted-foreground"><p>Nenhum tipo ou período ativo encontrado.</p><Link href="/teacher/task-types" className="text-primary">Tipos de tarefa</Link><Link href="/teacher/periods" className="ml-4 text-primary">Períodos</Link></div> : <TaskForm key={`${draft?.id ?? 'new'}-${typeQ}-${periodQ}-${typePage}-${periodPage}`} types={typeOptions} periods={periodOptions} draft={draft} selection={selection} />}
  </div>;
}