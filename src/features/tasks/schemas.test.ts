import { describe, expect, it } from 'vitest';
import { taskDraftSchema, taskTypeSchema } from './schemas';
const id = '80000000-0000-4000-8000-000000000001';
const draft = { title: 'Verso', description: '', taskTypeId: id, periodId: id, maximumScore: 100, startDate: '2026-10-01', dueDate: '2026-10-10', classIds: [id], groupIds: [], studentIds: [] };
describe('tasks validation', () => {
  it('accepts valid draft', () => expect(taskDraftSchema.safeParse(draft).success).toBe(true));
  it('requires destinations', () => expect(taskDraftSchema.safeParse({ ...draft, classIds: [] }).success).toBe(false));
  it('rejects reversed or invalid dates', () => {
    expect(taskDraftSchema.safeParse({ ...draft, dueDate: '2026-09-01' }).success).toBe(false);
    expect(taskDraftSchema.safeParse({ ...draft, dueDate: '2026-02-30' }).success).toBe(false);
  });
  it('rejects negative points', () => expect(taskDraftSchema.safeParse({ ...draft, maximumScore: -1 }).success).toBe(false));
  it('validates configurable task type score', () => {
    expect(taskTypeSchema.safeParse({ name: 'Resumo', description: '', defaultScore: 200, active: true }).success).toBe(true);
    expect(taskTypeSchema.safeParse({ name: 'Resumo', description: '', defaultScore: -1, active: true }).success).toBe(false);
  });
});