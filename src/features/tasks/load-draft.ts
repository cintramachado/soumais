import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Selection, Destination } from './components/task-recipients';

type TargetRow = { class_id: string | null; group_id: string | null; student_id: string | null; classes: Destination | null; groups: Destination | null; students: Destination | null };

export async function loadTaskTargets(taskId: string) {
  const client = await createClient();
  const { data, error } = await client.from('task_targets').select('class_id,group_id,student_id,classes(id,name),groups(id,name),students(id,name)').eq('task_id', taskId).limit(1000);
  const selected: Selection = { classes: [], groups: [], students: [] };
  for (const row of (data ?? []) as unknown as TargetRow[]) {
    if (row.classes) selected.classes.push(row.classes);
    if (row.groups) selected.groups.push(row.groups);
    if (row.students) selected.students.push(row.students);
  }
  return { selected, error };
}