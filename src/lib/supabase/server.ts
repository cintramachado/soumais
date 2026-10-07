import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerSupabaseConfig, getSupabaseCookieName } from "@/lib/supabase/config";

export async function createClient() {
  const config = getServerSupabaseConfig();
  if (!config) throw new Error("Supabase environment is not configured.");

  const cookieStore = await cookies();

  const cookieName = getSupabaseCookieName();
  return createServerClient(config.url, config.key, {
    ...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes are handled by the proxy during Server Component renders.
        }
      },
    },
  });
}