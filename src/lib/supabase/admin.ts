import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

export function createAdminClient() {
  const config = getSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !secretKey) throw new Error('Supabase admin key is not configured.');

  return createSupabaseClient(config.url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}