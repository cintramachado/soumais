import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!getSupabaseConfig()) redirect("/setup");
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}