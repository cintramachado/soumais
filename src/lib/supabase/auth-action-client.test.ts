import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createSupabaseClientMock = vi.fn(() => ({ auth: {} }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createSupabaseClientMock(...args),
}));

const ORIGINAL_ENV = { ...process.env };

describe('createAuthActionClient', () => {
  beforeEach(() => {
    createSupabaseClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://corymblike-prohibitively-wilma.ngrok-free.dev';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.SUPABASE_URL_INTERNAL;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('forces the implicit flow and never persists a session', async () => {
    const { createAuthActionClient } = await import('./auth-action-client');
    createAuthActionClient();

    expect(createSupabaseClientMock).toHaveBeenCalledWith(
      'https://corymblike-prohibitively-wilma.ngrok-free.dev',
      'anon-key',
      {
        auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false },
      },
    );
  });

  it('throws an explicit error when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { createAuthActionClient } = await import('./auth-action-client');
    expect(() => createAuthActionClient()).toThrow(/Supabase environment is not configured/);
  });
});
