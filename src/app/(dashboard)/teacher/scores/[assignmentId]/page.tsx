import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { SchoolLoadError, formatDatePtBr } from '@/features/school/components/school-empty-state';
import { ResultForm } from '@/features/scores/components/result-form';
import { resultLabels } from '@/features/scores/labels';
import { AdjustmentForm } from '@/features/scores/components/adjustment-form';
import type { ResultStatus } from '@/features/scores/domain/score-calculator';

type TaskInfo = { id: string; title: string; status: string; start_date: string; due_date: string; maximum_score: number; score_policies: { late_multiplier: number } };

export default async function AssignmentScorePage({ params, searchParams }: { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ page?: string }> }) {
  const profile = await requireProfile('teacher');
  const { assignmentId } = await params;
  if (!z.uuid().safeParse(assignmentId).success) notFound();
  const filters = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(filters.page ?? '1') || 1));
  const client = await createClient();
  const [assignment, history, organization] = await Promise.all([
    client.from('student_tasks').select('id,status,completed_at,calculated_score,manual_score,manual_score_reason,updated_at,students!inner(name),tasks!inner(id,title,status,start_date,due_date,maximum_score,score_policies!inner(late_multiplier))').eq('id', assignmentId).maybeSingle(),
    client.from('score_history').select('id,previous_score,new_score,reason,changed_by,changed_at,previous_manual_score,new_manual_score,previous_calculated_score,new_calculated_score,previous_status,new_status', { count: 'exact' }).eq('student_task_id', assignmentId).order('changed_at', { ascending: false }).order('id').range((page - 1) * 20, page * 20 - 1),
    client.from('organizations').select('timezone').eq('id', profile.organizationId).single(),
  ]);
  if (assignment.error || history.error || organization.error) return <SchoolLoadError />;
  if (!assignment.data) notFound();
  const entry = assignment.data;
  const task = entry.tasks as unknown as TaskInfo;
  const student = entry.students as unknown as { name: string };
  const timezone = organization.data!.timezone;
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateParts = entry.completed_at ? dateFormatter.formatToParts(new Date(entry.completed_at)) : [];
  const completedDate = entry.completed_at ? `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}-${dateParts.find((part) => part.type === 'day')?.value}` : '';
  const timestampFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' });
  const canRecord = task.status === 'active' || task.status === 'closed';
  return <div className="space-y-7">
    <header className="border-b pb-5"><Link href={`/teacher/tasks/${task.id}`} className="inline-block py-2 text-sm text-primary">Voltar à tarefa</Link><h1 className="mt-2 break-words text-2xl font-semibold">{student.name}</h1><p className="mt-2 break-words text-sm text-muted-foreground">{task.title} · Prazo: {formatDatePtBr(task.due_date)}</p></header>
    <dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Calculada</dt><dd>{entry.calculated_score} pontos</dd></div><div><dt className="text-sm text-muted-foreground">Manual</dt><dd>{entry.manual_score ?? 'Sem ajuste'}</dd></div><div><dt className="text-sm text-muted-foreground">Pontuação vigente</dt><dd>{entry.manual_score ?? entry.calculated_score} pontos</dd></div><div><dt className="text-sm text-muted-foreground">Pontos concedidos em atraso</dt><dd>{Math.round(task.score_policies.late_multiplier * 10000) / 100}%</dd></div></dl>
    {entry.manual_score_reason && <p className="break-words text-sm">Motivo do ajuste: {entry.manual_score_reason}</p>}
    {canRecord && <section className="space-y-4 border-y py-6"><h2 className="text-lg font-semibold">Resultado</h2><ResultForm key={`result-${entry.id}`} id={entry.id} status={entry.status as ResultStatus} completedDate={completedDate} startDate={task.start_date} dueDate={task.due_date} maximumScore={task.maximum_score} lateMultiplier={task.score_policies.late_multiplier} manualScore={entry.manual_score} /></section>}
    {canRecord && <section className="space-y-4 border-b pb-6"><h2 className="text-lg font-semibold">Ajuste manual</h2><AdjustmentForm key={`manual-${entry.id}`} id={entry.id} maximumScore={task.maximum_score} calculatedScore={entry.calculated_score} manualScore={entry.manual_score} /></section>}
    <section className="space-y-4"><h2 className="text-lg font-semibold">Histórico de pontuação</h2><ol className="divide-y border-y bg-white">{history.data?.map((event) => {
      const resultReason = event.reason.startsWith('Result recorded: ') ? `Registro de resultado: ${resultLabels[event.new_status as ResultStatus] ?? event.new_status}` : event.reason;
      return <li key={event.id} className="space-y-2 p-4 text-sm"><p className="font-medium">{event.previous_score ?? 0} → {event.new_score} pontos</p><p className="break-words">{resultReason}</p><p className="text-xs text-muted-foreground">{timestampFormatter.format(new Date(event.changed_at))} · {event.changed_by === profile.id ? profile.full_name : 'Usuário autorizado'}</p><p className="text-xs text-muted-foreground">Calculada: {event.previous_calculated_score ?? '—'} → {event.new_calculated_score ?? '—'} · Manual: {event.previous_manual_score ?? '—'} → {event.new_manual_score ?? '—'}</p></li>;
    })}{!history.data?.length && <li className="p-6 text-sm text-muted-foreground">Nenhuma alteração de pontuação registrada.</li>}</ol><nav aria-label="Paginação do histórico" className="flex justify-between text-sm">{page > 1 ? <Link href={`?page=${page - 1}`}>Anterior</Link> : <span />}{page * 20 < (history.count ?? 0) && <Link href={`?page=${page + 1}`}>Próxima</Link>}</nav></section>
  </div>;
}