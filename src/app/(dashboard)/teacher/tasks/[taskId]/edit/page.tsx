import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { TaskEditor } from '@/features/tasks/components/task-editor';
import { loadTaskTargets } from '@/features/tasks/load-draft';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function EditTaskPage({ params, searchParams }: { params: Promise<{ taskId: string }>; searchParams: Promise<{ typeQ?: string; periodQ?: string; typePage?: string; periodPage?: string }> }) {
  await requireProfile('teacher');
  const { taskId } = await params;
  if (!z.uuid().safeParse(taskId).success) notFound();
  const client = await createClient();
  const { data: task, error } = await client.from('tasks').select('id,title,description,task_type_id,period_id,start_date,due_date,maximum_score,status').eq('id', taskId).maybeSingle();
  if (error) return <SchoolLoadError />;
  if (!task) notFound();
  if (task.status !== 'draft') redirect(`/teacher/tasks/${taskId}`);
  const targets = await loadTaskTargets(taskId);
  if (targets.error) return <SchoolLoadError />;
  return <div className="space-y-6"><header className="border-b pb-5"><Link href={`/teacher/tasks/${taskId}`} className="inline-block py-2 text-sm text-primary">Voltar à tarefa</Link><h1 className="mt-2 text-2xl font-semibold">Editar rascunho</h1></header>
    <TaskEditor filters={await searchParams} selection={targets.selected} draft={{ id: task.id, title: task.title, description: task.description ?? '', taskTypeId: task.task_type_id, periodId: task.period_id, startDate: task.start_date, dueDate: task.due_date, maximumScore: task.maximum_score, classIds: targets.selected.classes.map((item) => item.id), groupIds: targets.selected.groups.map((item) => item.id), studentIds: targets.selected.students.map((item) => item.id) }} />
  </div>;
}