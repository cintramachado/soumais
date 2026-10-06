import Link from 'next/link';
import { requireProfile } from '@/lib/auth/profile';
import { TaskEditor } from '@/features/tasks/components/task-editor';

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ typeQ?: string; periodQ?: string; typePage?: string; periodPage?: string }> }) {
  await requireProfile('teacher');
  return <div className="space-y-6"><header className="border-b pb-5"><Link href="/teacher/tasks" className="inline-block py-2 text-sm text-primary">Voltar às tarefas</Link><h1 className="mt-2 text-2xl font-semibold">Nova tarefa</h1></header><TaskEditor filters={await searchParams} /></div>;
}