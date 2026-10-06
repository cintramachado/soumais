import { describe, expect, it } from 'vitest';
import { parentAccountSchema, parentLinkSchema, parentSchema } from './schemas';

describe('parent validation', () => {
  it('requires a name and limits phone length', () => {
    expect(parentSchema.safeParse({ name: 'Ana', phone: '', active: true }).success).toBe(true);
    expect(parentSchema.safeParse({ name: ' ', phone: '', active: true }).success).toBe(false);
    expect(parentSchema.safeParse({ name: 'Ana', phone: '1'.repeat(31), active: true }).success).toBe(false);
  });
  it('requires valid identifiers and relationship for a link', () => {
    expect(parentLinkSchema.safeParse({ parentId: '60000000-0000-4000-8000-000000000001', studentId: '60000000-0000-4000-8000-000000000002', relationship: 'Mãe' }).success).toBe(true);
    expect(parentLinkSchema.safeParse({ parentId: 'bad', studentId: 'bad', relationship: '' }).success).toBe(false);
  });
  it('requires a valid account email', () => {
    expect(parentAccountSchema.safeParse({ parentId: '60000000-0000-4000-8000-000000000001', email: 'invalid' }).success).toBe(false);
  });
});