"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getProfile, getRolePath } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendParentAccessEmail } from "@/lib/email/parent-access";
import { newPasswordSchema, recoverySchema, signInSchema } from "@/lib/validation/auth";

export type AuthActionResult = { error?: string; success?: string };

export async function signInAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira o email e a senha informados." };

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
  if (signInError) return { error: "Não foi possível entrar. Confira o email e a senha ou use ‘Esqueci minha senha’. Se ainda não recebeu acesso, solicite à escola a criação da sua conta." };

  const profile = await getProfile();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Este acesso ainda não está habilitado. Fale com a administração." };
  }

  redirect(getRolePath(profile.role));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(input: unknown): Promise<AuthActionResult> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return { error: "Informe um email válido." };

  const supabase = await createClient();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3003");
  const redirectTo = new URL("/auth/invite", origin).toString();

  if (process.platform === "win32") {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
        options: { redirectTo },
      });
      if (error || !data.user || !data.properties?.action_link) {
        if (process.env.NODE_ENV === "development") console.error("Password recovery link generation failed", error?.code);
        return { success: "Se o email estiver cadastrado, você receberá as instruções." };
      }

      await sendParentAccessEmail({
        email: parsed.data.email,
        actionLink: data.properties.action_link,
        isRecovery: true,
      });
      return { success: "Se o email estiver cadastrado, você receberá as instruções." };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Password recovery email failed", error instanceof Error ? error.name : "UnknownError");
      }
      return { error: "Não foi possível solicitar a recuperação agora." };
    }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) return { error: "Não foi possível solicitar a recuperação agora." };
  return { success: "Se o email estiver cadastrado, você receberá as instruções." };
}

export async function updatePassword(input: unknown): Promise<AuthActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "Solicite um novo link de recuperação." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível atualizar a senha." };

  redirect("/login?password=updated");
}