import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { TaskControls } from '@/features/tasks/components/task-controls';
import { loadTaskTargets } from '@/features/tasks/load-draft';
import { taskStatusLabels } from '@/features/tasks/types';
import { SchoolLoadError, formatDatePtBr } from '@/features/school/components/school-empty-state';

export default async function TaskDetailPage({ params, searchParams }: { params: Promise<{ taskId: string }>; searchParams: Promise<{ page?: string }> }) {
  await requireProfile('teacher');
  const { taskId } = await params;
  if (!z.uuid().safeParse(taskId).success) notFound();
  const filter = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(filter.page ?? '1') || 1));
  const client = await createClient();
  const [taskResult, targets, assignments] = await Promise.all([
    client.from('tasks').select('id,title,description,status,start_date,due_date,maximum_score,activated_at').eq('id', taskId).maybeSingle(),
    loadTaskTargets(taskId),
    client.from('student_tasks').select('id,status,students!inner(name)', { count: 'exact' }).eq('task_id', taskId).order('student_id').range((page - 1) * 20, page * 20 - 1),
  ]);
  if (taskResult.error || targets.error || assignments.error) return <SchoolLoadError />;
  const task = taskResult.data;
  if (!task) notFound();
  return <div className="space-y-7"><header className="border-b pb-5"><Link href="/teacher/tasks" className="inline-block py-2 text-sm text-primary">Voltar às tarefas</Link><h1 className="mt-2 break-words text-2xl font-semibold">{task.title}</h1><p className="mt-2 text-sm text-muted-foreground">{taskStatusLabels[task.status]}</p></header>
    <dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Início</dt><dd>{formatDatePtBr(task.start_date)}</dd></div><div><dt className="text-sm text-muted-foreground">Prazo</dt><dd>{formatDatePtBr(task.due_date)}</dd></div><div><dt className="text-sm text-muted-foreground">Pontuação máxima</dt><dd>{task.maximum_score}</dd></div></dl>
    {task.description && <p className="whitespace-pre-wrap break-words text-sm">{task.description}</p>}
    <div className="flex flex-wrap items-center gap-4">{task.status === 'draft' && <Link href={`/teacher/tasks/${taskId}/edit`} className="rounded-md border bg-white px-4 py-3 text-sm">Editar rascunho</Link>}<TaskControls id={taskId} status={task.status} /></div>
    <section className="border-y py-5"><h2 className="text-lg font-semibold">Destinatários</h2><dl className="mt-3 space-y-2 text-sm">{Object.entries(targets.selected).map(([key, values]) => <div key={key}><dt className="font-medium">{key === 'classes' ? 'Turmas' : key === 'groups' ? 'Grupos' : 'Alunos específicos'}</dt><dd className="break-words text-muted-foreground">{values.map((item) => item.name).join(', ') || 'Nenhum'}</dd></div>)}</dl></section>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Alunos atribuídos ({assignments.count ?? 0})</h2><ul className="divide-y border-y bg-white">{assignments.data?.map((assignment) => <li key={assignment.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span className="break-words">{(assignment.students as unknown as { name: string }).name}</span><span className="text-muted-foreground">{assignment.status === 'pending' ? 'Pendente' : assignment.status === 'completed_on_time' ? 'No prazo' : assignment.status === 'completed_late' ? 'Atrasada' : 'Não realizada'}</span></li>)}{!assignments.data?.length && <li className="p-6 text-sm text-muted-foreground">{task.status === 'draft' ? 'Nenhuma atribuição gerada. A tarefa está em rascunho.' : 'Nenhuma atribuição visível.'}</li>}</ul>
      <nav aria-label="Paginação das atribuições" className="flex justify-between text-sm">{page > 1 ? <Link href={`?page=${page - 1}`}>Anterior</Link> : <span />}{page * 20 < (assignments.count ?? 0) && <Link href={`?page=${page + 1}`}>Próxima</Link>}</nav>
    </section>
  </div>;
}