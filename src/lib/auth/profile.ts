import { redirect } from "next/navigation";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const appRoles = ["teacher", "student", "parent"] as const;
export type AppRole = (typeof appRoles)[number];

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
  organizationId: string;
};

export function getRolePath(role: AppRole) {
  return `/${role}`;
}

export async function getProfile() {
  if (!getSupabaseConfig()) return null;

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || !appRoles.includes(data.role as AppRole) || !data.active) {
    return null;
  }

  const { data: organizationId, error: organizationError } = await supabase.rpc("current_organization_id");
  if (organizationError || typeof organizationId !== "string") return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("profile_id", userId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();

  if (membershipError || !membership || !appRoles.includes(membership.role as AppRole)) {
    return null;
  }

  return { ...data, role: membership.role as AppRole, organizationId } as Profile;
}

export async function requireProfile(role?: AppRole) {
  if (!getSupabaseConfig()) redirect("/setup");
  const profile = await getProfile();
  if (!profile) redirect("/login?error=profile");
  if (role && profile.role !== role) redirect(getRolePath(profile.role));
  return profile;
}