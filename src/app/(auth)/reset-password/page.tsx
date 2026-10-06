import { RecoveryForm } from "@/features/auth/components/recovery-form";
import { SetupNotice } from "@/features/auth/components/setup-notice";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  if (!getSupabaseConfig()) return <SetupNotice />;
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7f4] px-5 py-12">
      <RecoveryForm mode="update" />
    </main>
  );
}