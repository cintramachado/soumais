import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerSupabaseConfig } from './config';

/**
 * Client used only to trigger Supabase Auth emails (e.g. password recovery)
 * from the server on behalf of another person (self-service "esqueci minha
 * senha" or an admin resending access to an existing account).
 *
 * `@supabase/ssr`'s `createServerClient` hardcodes `flowType: "pkce"`, which
 * stores the PKCE code verifier as a cookie on whoever's browser made the
 * request. That breaks recovery links whenever the email is opened in a
 * different browser/device than the one that triggered it (always true for
 * admin-triggered resets, and often true for self-service ones). Using the
 * implicit flow here avoids the code-verifier dependency entirely, matching
 * how `inviteUserByEmail` already behaves.
 */
export function createAuthActionClient() {
  const config = getServerSupabaseConfig();
  if (!config) throw new Error('Supabase environment is not configured.');

  return createSupabaseClient(config.url, config.key, {
    auth: { flowType: 'implicit', autoRefreshToken: false, persistSession: false },
  });
}
