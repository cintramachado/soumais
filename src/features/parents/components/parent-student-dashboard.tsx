import type { z } from 'zod';
import { formatDatePtBr } from '@/features/school/components/school-empty-state';
import { parentStudentDashboardSchema } from '../schemas';

type ParentStudentDashboardData = z.infer<typeof parentStudentDashboardSchema>;

const statusLabels = {
  pending: 'Pendente',
  completed_on_time: 'Concluída no prazo',
  completed_late: 'Concluída com atraso',
  not_completed: 'Não realizada',
} as const;

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const formatScore = (value: number) => numberFormat.format(value);

export function ParentStudentDashboard({ data, relationship }: { data: ParentStudentDashboardData; relationship: string }) {
  const { student, summary, tasks } = data;
  const metrics = [
    { label: 'Pontuação', value: `${formatScore(summary.totalScore)} / ${formatScore(summary.maximumScore)}` },
    { label: 'Tarefas realizadas', value: `${summary.completedCount} de ${summary.assignedCount}` },
    { label: 'Pendentes', value: String(summary.pendingCount) },
    { label: 'Aproveitamento', value: `${formatScore(summary.achievementPercentage)}%` },
  ];

  return <>
    <section aria-label="Dados do aluno" className="space-y-3 border-y py-6">
      <h2 className="break-words text-xl font-semibold">{student.name}</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-muted-foreground">Nascimento</dt><dd>{formatDatePtBr(student.birthDate)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Vínculo</dt><dd>{relationship}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Situação</dt><dd>{student.active ? 'Ativo' : 'Inativo'}</dd></div>
      </dl>
    </section>

    <section aria-label="Resumo de desempenho" className="grid gap-3 border-b py-6 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <div key={metric.label} className="border border-[#dce4de] bg-white p-4">
        <p className="text-sm text-muted-foreground">{metric.label}</p>
        <p className="mt-3 break-words text-xl font-semibold tabular-nums">{metric.value}</p>
      </div>)}
      {summary.lateCount > 0 && <p className="text-sm text-amber-800">Tarefas concluídas com atraso: {summary.lateCount}</p>}
      {summary.notCompletedCount > 0 && <p className="text-sm text-destructive">Tarefas não realizadas: {summary.notCompletedCount}</p>}
    </section>

    <section aria-labelledby="parent-tasks-title" className="space-y-4 pt-2">
      <div className="border-b pb-3">
        <h3 id="parent-tasks-title" className="text-lg font-semibold">Tarefas</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tarefas publicadas em períodos ativos ou encerrados.</p>
      </div>
      {!tasks.length ? <p className="py-8 text-sm text-muted-foreground">Ainda não há tarefas publicadas para este aluno.</p> : (
        <ul className="divide-y">
          {tasks.map((task) => <li key={task.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <h4 className="break-words font-medium">{task.title}</h4>
              <p className="mt-1 break-words text-sm text-muted-foreground">{task.taskType} · {task.period}</p>
              <p className="mt-1 text-xs text-muted-foreground">Prazo: {formatDatePtBr(task.dueDate)}</p>
              {task.completedAt && <p className="text-xs text-muted-foreground">Concluída em: {formatDatePtBr(task.completedAt)}</p>}
              {task.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{task.description}</p>}
            </div>
            <div className="sm:text-right">
              <p className="font-medium tabular-nums">
                {task.status === 'pending' ? 'Sem nota' : `${formatScore(task.score)} / ${formatScore(task.maximumScore)} pts`}
              </p>
              <p className={`mt-1 text-sm ${task.status === 'completed_late' || task.status === 'not_completed' ? 'text-amber-800' : 'text-muted-foreground'}`}>
                {statusLabels[task.status]}
              </p>
            </div>
          </li>)}
        </ul>
      )}
    </section>
  </>;
}