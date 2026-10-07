"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig, getSupabaseCookieName } from "@/lib/supabase/config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase environment is not configured.");
  const cookieName = getSupabaseCookieName();
  return createBrowserClient(config.url, config.key, cookieName ? { cookieOptions: { name: cookieName } } : undefined);
}