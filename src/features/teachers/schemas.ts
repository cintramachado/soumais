import { z } from 'zod';

export const teacherSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Informe o nome.').max(120),
  email: z.string().trim().email('Informe um email válido.').max(254),
  phone: z.string().trim().max(30),
  active: z.boolean(),
});
export const teacherClassSchema = z.object({ teacherId: z.uuid(), classId: z.uuid('Selecione uma turma.'), remove: z.boolean() });
export const teacherInviteSchema = z.object({ teacherId: z.uuid() });