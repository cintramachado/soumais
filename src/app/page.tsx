import { redirect } from "next/navigation";

import { getProfile, getRolePath } from "@/lib/auth/profile";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!getSupabaseConfig()) redirect("/setup");

  const profile = await getProfile();
  if (profile) redirect(getRolePath(profile.role));
  redirect("/login");
}