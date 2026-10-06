import { z } from 'zod';

export const parentSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Informe o nome.').max(120, 'Use até 120 caracteres.'),
  phone: z.string().trim().max(30, 'Use até 30 caracteres.'),
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
export const parentRemoveLinkSchema = parentLinkSchema.pick({ parentId: true, studentId: true });