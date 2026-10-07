import { z } from 'zod';

export const reportFilterSchema = z.object({
  classId: z.uuid('Selecione a turma.'),
  periodId: z.union([z.uuid(), z.literal('')]).optional(),
  groupId: z.union([z.uuid(), z.literal('')]).optional(),
});
export const classReportSchema = z.object({
  className: z.string(), schoolYear: z.number().int(), periodName: z.string().nullable(), groupName: z.string().nullable(),
  timezone: z.string(), generatedAt: z.string(), teachers: z.array(z.string()),
  groupTeachers: z.array(z.object({ groupName: z.string(), teacherName: z.string().nullable(), teacherActive: z.boolean().nullable() })),
  students: z.array(z.object({
    id: z.uuid(), name: z.string(), active: z.boolean(), groups: z.array(z.string()),
    score: z.number().finite().nonnegative(), maximumScore: z.number().finite().nonnegative(),
    assigned: z.number().int().nonnegative(), completed: z.number().int().nonnegative(),
  })).max(1000),
});
export type ClassReport = z.infer<typeof classReportSchema>;