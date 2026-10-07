import { z } from 'zod';

export const contactEmailSchema = z.string().trim().max(254, 'Use até 254 caracteres.')
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Informe um email válido.').optional();