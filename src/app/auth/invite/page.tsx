import { InviteCallback } from "@/features/auth/components/invite-callback";
import { SetupNotice } from "@/features/auth/components/setup-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function InviteCallbackPage() {
  if (!getSupabaseConfig()) return <SetupNotice />;
  return <InviteCallback />;
}