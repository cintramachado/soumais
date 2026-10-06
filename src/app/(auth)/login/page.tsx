import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { SetupNotice } from "@/features/auth/components/setup-notice";
import { getProfile, getRolePath } from "@/lib/auth/profile";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; password?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!getSupabaseConfig()) return <SetupNotice />;

  const profile = await getProfile();
  if (profile) redirect(getRolePath(profile.role));

  const params = await searchParams;
  const initialError = params.error === "profile"
    ? "O perfil deste usuário está inativo ou ainda não foi provisionado."
    : params.error === "recovery"
      ? "O link de recuperação expirou ou não é válido. Solicite outro link."
    : undefined;

  return <LoginForm initialError={initialError} passwordUpdated={params.password === "updated"} />;
}