import { z } from "zod";

const dateField = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");
const nameField = z.string().trim().min(1, "Informe um nome.").max(120);
const uuidField = z.string().uuid();

export const activeStateSchema = z.object({
  id: uuidField,
  active: z.boolean(),
});

export const schoolYearSchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200),
  startDate: dateField,
  endDate: dateField,
}).refine((value) => value.endDate >= value.startDate, {
  message: "O término deve ser igual ou posterior ao início.",
  path: ["endDate"],
});

export const schoolYearUpdateSchema = schoolYearSchema.extend({
  id: uuidField,
  active: z.boolean(),
});

export const periodSchema = z.object({
  schoolYearId: uuidField,
  name: nameField,
  startDate: dateField,
  endDate: dateField,
}).refine((value) => value.endDate >= value.startDate, {
  message: "O término deve ser igual ou posterior ao início.",
  path: ["endDate"],
});

export const periodUpdateSchema = periodSchema.extend({
  id: uuidField,
  active: z.boolean(),
});

export const classSchema = z.object({
  schoolYearId: uuidField,
  name: nameField,
});

export const classUpdateSchema = z.object({
  id: uuidField,
  name: nameField,
  active: z.boolean(),
});

export const groupSchema = z.object({
  classId: uuidField,
  name: nameField,
});

export const groupUpdateSchema = z.object({
  id: uuidField,
  name: nameField,
  active: z.boolean(),
});

export const studentSchema = z.object({
  name: nameField,
  birthDate: dateField,
  classId: uuidField,
  groupId: z.union([uuidField, z.literal("")]).optional(),
});

export const studentUpdateSchema = z.object({
  id: uuidField,
  name: nameField,
  birthDate: dateField,
  active: z.boolean(),
});

export const studentGroupSchema = z.object({
  enrollmentId: uuidField,
  groupId: uuidField,
});

export const studentGroupRemoveSchema = studentGroupSchema;