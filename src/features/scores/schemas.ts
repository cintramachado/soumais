import { z } from 'zod';
import { resultStatuses } from './domain/score-calculator';

export const resultSchema = z.object({
  id: z.uuid(),
  status: z.enum(resultStatuses),
  completedDate: z.union([z.iso.date('Informe uma data válida.'), z.literal('')]),
}).refine((value) => !['completed_on_time', 'completed_late'].includes(value.status) || value.completedDate !== '', {
  path: ['completedDate'], message: 'Informe a data de realização.',
});
export const adjustmentSchema = z.object({
  id: z.uuid(),
  remove: z.boolean(),
  manualScore: z.number().finite().min(0).max(99999999.99).multipleOf(0.01).optional(),
  reason: z.string().trim().min(1, 'Informe o motivo.').max(2000),
}).refine((value) => value.remove || value.manualScore !== undefined, { path: ['manualScore'], message: 'Informe a pontuação.' });
export const scorePolicySchema = z.object({
  latePercentage: z.number().finite().min(0, 'Use de 0 a 100.').max(100, 'Use de 0 a 100.').multipleOf(0.01),
});