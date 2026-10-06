"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getProfile, getRolePath } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { newPasswordSchema, recoverySchema, signInSchema } from "@/lib/validation/auth";

export type AuthActionResult = { error?: string; success?: string };

export async function signInAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira o email e a senha informados." };

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
  if (signInError) return { error: "Email ou senha inválidos." };

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
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
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