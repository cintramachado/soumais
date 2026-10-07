import { describe, expect, it } from 'vitest';
import { teacherSchema, teacherClassSchema } from './schemas';
describe('teacher registry validation', () => {
  it('requires a valid name and email', () => {
    expect(teacherSchema.safeParse({ name: 'Ana', email: 'ana@example.com', phone: '', active: true }).success).toBe(true);
    expect(teacherSchema.safeParse({ name: '', email: 'invalid', phone: '', active: true }).success).toBe(false);
  });
  it('validates class assignment ids', () => expect(teacherClassSchema.safeParse({ teacherId: 'invalid', classId: 'invalid', remove: false }).success).toBe(false));
});