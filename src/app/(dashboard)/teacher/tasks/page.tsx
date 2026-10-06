import Link from 'next/link';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { SchoolLoadError, formatDatePtBr } from '@/features/school/components/school-empty-state';
import { taskStatusLabels, type TaskListItem } from '@/features/tasks/types';

const optionalId = z.union([z.uuid(), z.literal('')]).optional();
const filterSchema = z.object({ q: z.string().max(120).optional(), status: z.enum(['', 'draft', 'active', 'closed', 'cancelled']).optional(), type: optionalId, period: optionalId, class: optionalId, group: optionalId, from: z.union([z.iso.date(), z.literal('')]).optional(), to: z.union([z.iso.date(), z.literal('')]).optional(), page: z.coerce.number().int().min(1).max(10000).default(1) });

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireProfile('teacher');
  const parsed = filterSchema.safeParse(await searchParams);
  if (!parsed.success) return <div role="alert" className="space-y-4"><p>Os filtros informados são inválidos.</p><Link href="/teacher/tasks" className="text-primary">Limpar filtros</Link></div>;
  const filters = parsed.data;
  const client = await createClient();
  const [tasks, types, periods, classes, groups] = await Promise.all([
    client.rpc('list_teacher_tasks', { p_page: filters.page, p_search: filters.q ?? '', p_status: filters.status || null, p_type_id: filters.type || null, p_period_id: filters.period || null, p_class_id: filters.class || null, p_group_id: filters.group || null, p_from: filters.from || null, p_to: filters.to || null }),
    client.from('task_types').select('id,name').order('name').limit(100),
    client.from('periods').select('id,name').order('start_date', { ascending: false }).limit(100),
    client.from('classes').select('id,name').order('name').limit(100),
    client.from('groups').select('id,name').order('name').limit(100),
  ]);
  const rows = (tasks.data ?? []) as TaskListItem[];
  const total = Number(rows[0]?.total_count ?? 0);
  const url = (page: number) => `?${new URLSearchParams(Object.entries({ ...filters, page: String(page) }).filter((entry) => entry[1] !== undefined).map(([key, value]) => [key, String(value)]))}`;
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5"><h1 className="text-2xl font-semibold">Tarefas</h1><Link href="/teacher/tasks/new" className="rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">Nova tarefa</Link></header>
    <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">Título<input name="q" defaultValue={filters.q} className="mt-1 h-10 w-full min-w-0 rounded-md border bg-white px-2" /></label>
      <label className="text-sm">Situação<select name="status" defaultValue={filters.status ?? ''} className="mt-1 h-10 w-full rounded-md border bg-white px-2"><option value="">Todas</option>{Object.entries(taskStatusLabels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      {([
        ['type', 'Tipo', types.data], ['period', 'Período', periods.data], ['class', 'Turma', classes.data], ['group', 'Grupo', groups.data],
      ] as const).map(([key, label, values]) => <label key={key} className="text-sm">{label}<select name={key} defaultValue={filters[key] ?? ''} className="mt-1 h-10 w-full min-w-0 rounded-md border bg-white px-2"><option value="">Todos</option>{values?.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>)}
      <label className="text-sm">Prazo a partir de<input type="date" name="from" defaultValue={filters.from} className="mt-1 h-10 w-full min-w-0 rounded-md border bg-white px-2" /></label>
      <label className="text-sm">Prazo até<input type="date" name="to" defaultValue={filters.to} className="mt-1 h-10 w-full min-w-0 rounded-md border bg-white px-2" /></label>
      <div className="flex items-center gap-3"><button className="min-h-10 rounded-md border bg-white px-4 text-sm">Filtrar</button><Link href="/teacher/tasks" className="text-sm text-primary">Limpar</Link></div>
    </form>
    {tasks.error || types.error || periods.error || classes.error || groups.error ? <SchoolLoadError /> : <div className="divide-y border-y bg-white">{rows.map((task) => <article key={task.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><Link href={`/teacher/tasks/${task.id}`} className="break-words font-medium text-primary">{task.title}</Link><p className="mt-1 text-sm text-muted-foreground">{task.type_name} · {task.period_name}</p></div><div className="text-sm"><p>{formatDatePtBr(task.due_date)} · {task.maximum_score} pontos</p><p className="mt-1 text-muted-foreground">{taskStatusLabels[task.status]}</p></div></article>)}{!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>}</div>}
    <nav aria-label="Paginação de tarefas" className="flex justify-between text-sm">{filters.page > 1 ? <Link href={url(filters.page - 1)}>Anterior</Link> : <span />}<span>Página {filters.page}</span>{filters.page * 20 < total && <Link href={url(filters.page + 1)}>Próxima</Link>}</nav>
  </div>;
}