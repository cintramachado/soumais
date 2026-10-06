export const taskStatusLabels: Record<string, string> = {
  draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada', cancelled: 'Cancelada',
};
export type TaskListItem = { id: string; title: string; type_name: string; period_name: string; due_date: string; maximum_score: number; status: string; total_count: number };