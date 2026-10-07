import { describe, expect, it } from 'vitest';
import { resultSchema, adjustmentSchema, scorePolicySchema } from './schemas';
const id = '90000000-0000-4000-8000-000000000001';
describe('score validation', () => {
  it('requires a completion date for completed results', () => {
    expect(resultSchema.safeParse({ id, status: 'completed_late', completedDate: '' }).success).toBe(false);
    expect(resultSchema.safeParse({ id, status: 'pending', completedDate: '' }).success).toBe(true);
  });
  it('requires a reason for adding and removing manual points', () => {
    expect(adjustmentSchema.safeParse({ id, manualScore: 50, reason: '', remove: false }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ id, reason: 'Remove ajuste', remove: true }).success).toBe(true);
  });
  it('rejects invalid percentages', () => {
    expect(scorePolicySchema.safeParse({ latePercentage: 50 }).success).toBe(true);
    expect(scorePolicySchema.safeParse({ latePercentage: 101 }).success).toBe(false);
  });
});