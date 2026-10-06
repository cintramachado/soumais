import { describe, expect, it } from "vitest";

import { classSchema, periodSchema, schoolYearSchema, studentSchema } from "./schemas";

const schoolYearId = "20000000-0000-4000-8000-000000000001";
const classId = "30000000-0000-4000-8000-000000000001";

describe("school entity schemas", () => {
  it("accepts a valid school year", () => {
    expect(schoolYearSchema.safeParse({
      year: 2026,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    }).success).toBe(true);
  });

  it("rejects reversed or impossible date ranges", () => {
    expect(schoolYearSchema.safeParse({
      year: 2026,
      startDate: "2026-12-31",
      endDate: "2026-01-01",
    }).success).toBe(false);
    expect(periodSchema.safeParse({
      schoolYearId,
      name: "Etapa 1",
      startDate: "2026-02-30",
      endDate: "2026-03-01",
    }).success).toBe(false);
  });

  it("requires a valid school year relation for classes", () => {
    expect(classSchema.safeParse({ schoolYearId, name: "Adolescentes" }).success).toBe(true);
    expect(classSchema.safeParse({ schoolYearId: "invalid", name: "Adolescentes" }).success).toBe(false);
  });

  it("accepts student registration with or without an initial group", () => {
    const baseStudent = { name: "Ana Souza", birthDate: "2012-06-14", classId };
    expect(studentSchema.safeParse(baseStudent).success).toBe(true);
    expect(studentSchema.safeParse({ ...baseStudent, groupId: "" }).success).toBe(true);
    expect(studentSchema.safeParse({ ...baseStudent, groupId: "not-a-uuid" }).success).toBe(false);
  });
});