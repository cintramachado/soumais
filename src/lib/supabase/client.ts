"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase environment is not configured.");
  return createBrowserClient(config.url, config.key);
}