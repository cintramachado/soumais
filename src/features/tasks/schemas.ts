import { z } from 'zod';

export const taskTypeSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Informe o nome.').max(120),
  description: z.string().max(2000),
  defaultScore: z.number().finite().min(0, 'Use pontuação não negativa.').max(99999999.99),
  active: z.boolean(),
});
const dateValue = z.iso.date('Informe uma data válida.');
export const taskDraftSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  description: z.string().max(5000),
  taskTypeId: z.uuid('Selecione o tipo.'),
  periodId: z.uuid('Selecione o período.'),
  maximumScore: z.number().finite().min(0).max(99999999.99),
  startDate: dateValue,
  dueDate: dateValue,
  classIds: z.array(z.uuid()).max(100),
  groupIds: z.array(z.uuid()).max(200),
  studentIds: z.array(z.uuid()).max(700),
}).refine((data) => data.startDate <= data.dueDate, { path: ['dueDate'], message: 'O prazo deve ser posterior ou igual ao início.' })
  .refine((data) => data.classIds.length + data.groupIds.length + data.studentIds.length > 0, { path: ['classIds'], message: 'Selecione ao menos um destinatário.' });
export type TaskDraftValues = z.infer<typeof taskDraftSchema>;
export const taskStateSchema = z.object({ id: z.uuid(), state: z.enum(['cancelled', 'closed']) });