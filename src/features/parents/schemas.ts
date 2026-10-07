import { z } from 'zod';
import { contactEmailSchema } from '../../lib/validation/contact';

export const parentSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Informe o nome.').max(120, 'Use até 120 caracteres.'),
  phone: z.string().trim().max(30, 'Use até 30 caracteres.'),
  email: contactEmailSchema,
  active: z.boolean(),
});
export const parentLinkSchema = z.object({
  parentId: z.uuid(),
  studentId: z.uuid('Selecione um aluno.'),
  relationship: z.string().trim().min(1, 'Informe o parentesco.').max(60),
});
export const parentAccountSchema = z.object({
  parentId: z.uuid(),
  email: z.email('Informe um email válido.').trim(),
});
export const parentInviteSchema = z.object({ parentId: z.uuid() });
export const parentStudentDashboardSchema = z.object({
  student: z.object({ id: z.uuid(), name: z.string(), birthDate: z.string(), active: z.boolean() }),
  summary: z.object({
    totalScore: z.number(), maximumScore: z.number(), assignedCount: z.number(), completedCount: z.number(),
    pendingCount: z.number(), notCompletedCount: z.number(), lateCount: z.number(), onTimeCount: z.number(),
    achievementPercentage: z.number(),
  }),
  tasks: z.array(z.object({
    id: z.uuid(), title: z.string(), description: z.string().nullable(), taskType: z.string(), period: z.string(),
    startDate: z.string(), dueDate: z.string(), maximumScore: z.number(), score: z.number(),
    status: z.enum(['pending', 'completed_on_time', 'completed_late', 'not_completed']),
    completedAt: z.string().nullable(),
  })),
});
export const parentRemoveLinkSchema = parentLinkSchema.pick({ parentId: true, studentId: true });