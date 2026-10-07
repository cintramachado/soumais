import { describe, expect, it } from 'vitest';
import { contactEmailSchema } from './contact';
describe('contact email', () => {
  it('allows existing records without email', () => {
    expect(contactEmailSchema.safeParse(undefined).success).toBe(true);
    expect(contactEmailSchema.safeParse('').success).toBe(true);
  });
  it('accepts and trims valid email', () => expect(contactEmailSchema.parse(' aluno@example.com ')).toBe('aluno@example.com'));
  it('rejects malformed email', () => expect(contactEmailSchema.safeParse('invalid').success).toBe(false));
});