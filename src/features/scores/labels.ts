import type { ResultStatus } from './domain/score-calculator';

export const resultLabels: Record<ResultStatus, string> = {
  pending: 'Pendente', completed_on_time: 'No prazo', completed_late: 'Atrasada', not_completed: 'Não realizada',
};