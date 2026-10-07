export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function getServerSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return { ...config, url: process.env.SUPABASE_URL_INTERNAL ?? config.url };
}

export function getSupabaseCookieName() {
  return process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME;
}