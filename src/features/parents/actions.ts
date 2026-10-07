'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAccountAccessEmail } from '@/lib/email/account-access';
import { parentAccountSchema, parentInviteSchema, parentLinkSchema, parentRemoveLinkSchema, parentSchema } from './schemas';

export type ParentResult = { error?: string; success?: string };

async function executeRpc(name: string, values: Record<string, unknown>): Promise<ParentResult> {
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc(name, values);
  if (error) {
    if (process.env.NODE_ENV === 'development') console.error('Parent operation failed', error.code);
    return { error: 'Não foi possível salvar. Confira os dados e tente novamente.' };
  }
  revalidatePath('/teacher/parents', 'layout');
  revalidatePath('/parent');
  return { success: 'Alteração salva.' };
}

export async function saveParent(input: unknown): Promise<ParentResult> {
  const parsed = parentSchema.safeParse(input);
  if (!parsed.success) return { error: 'Confira os dados do responsável.' };
  return executeRpc('save_parent_contact', {
    p_id: parsed.data.id ?? null,
    p_name: parsed.data.name,
    p_email: parsed.data.email || null,
    p_phone: parsed.data.phone || null,
    p_active: parsed.data.active,
  });
}

export async function linkParentStudent(input: unknown): Promise<ParentResult> {
  const parsed = parentLinkSchema.safeParse(input);
  if (!parsed.success) return { error: 'Selecione o aluno e informe o parentesco.' };
  return executeRpc('set_parent_student', {
    p_parent_id: parsed.data.parentId,
    p_student_id: parsed.data.studentId,
    p_relationship: parsed.data.relationship,
  });
}

export async function unlinkParentStudent(input: unknown): Promise<ParentResult> {
  const parsed = parentRemoveLinkSchema.safeParse(input);
  if (!parsed.success) return { error: 'Vínculo inválido.' };
  return executeRpc('set_parent_student', {
    p_parent_id: parsed.data.parentId,
    p_student_id: parsed.data.studentId,
    p_relationship: '',
    p_remove: true,
  });
}

export async function attachParentAccount(input: unknown): Promise<ParentResult> {
  const parsed = parentAccountSchema.safeParse(input);
  if (!parsed.success) return { error: 'Informe um email válido.' };
  const result = await executeRpc('attach_parent_account', {
    p_parent_id: parsed.data.parentId,
    p_email: parsed.data.email,
  });
  return result.error
    ? { error: 'Não foi possível associar a conta. Ela deve estar ativa, com perfil de responsável nesta organização e não estar associada a outro cadastro.' }
    : result;
}

export async function inviteParentAccount(input: unknown): Promise<ParentResult> {
  const parsed = parentInviteSchema.safeParse(input);
  if (!parsed.success) return { error: 'Cadastro de responsável inválido.' };

  const teacher = await requireProfile('teacher');
  const client = await createClient();
  const { data: parent, error: parentError } = await client
    .from('parents')
    .select('id,name,email,active,profile_id,organization_id')
    .eq('id', parsed.data.parentId)
    .maybeSingle();

  if (parentError || !parent || parent.organization_id !== teacher.organizationId) {
    return { error: 'Não foi possível localizar este responsável.' };
  }
  if (!parent.active) return { error: 'Ative o cadastro antes de enviar o convite.' };
  if (!parent.email) return { error: 'Salve um email de contato no cadastro antes de enviar o convite.' };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: 'A chave administrativa do Supabase não está configurada no servidor.' };
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : 'http://localhost:3003');
  const redirectTo = new URL('/auth/invite', origin).toString();

  const directDelivery = process.env.SOULMAIS_EMAIL_DELIVERY_MODE === 'direct';
  if (parent.profile_id && !directDelivery) {
    const { error } = await client.auth.resetPasswordForEmail(parent.email, { redirectTo });
    if (error) return { error: 'Não foi possível enviar o link de senha. Tente novamente.' };
    return { success: 'Link para criar ou atualizar a senha enviado.' };
  }

  let userId: string;
  let actionLink: string;
  let isRecovery = false;

  if (directDelivery) {
    const profileQuery = admin.from('profiles').select('id,email,role,active')
      .eq(parent.profile_id ? 'id' : 'email', parent.profile_id ?? parent.email);
    const { data: existingProfile, error: profileError } = await profileQuery.maybeSingle();
    if (profileError) return { error: 'Não foi possível validar a conta do responsável.' };

    if (parent.profile_id && (!existingProfile || existingProfile.id !== parent.profile_id
      || existingProfile.email.toLowerCase() !== parent.email.toLowerCase()
      || existingProfile.role !== 'parent' || !existingProfile.active)) {
      return { error: 'O email de contato não corresponde à conta de responsável vinculada.' };
    }

    if (existingProfile && existingProfile.role !== 'parent') {
      return { error: 'Já existe uma conta com esse email que não está provisionada como responsável.' };
    }

    let existingAuthUser = null;
    if (existingProfile) {
      const { data, error } = await admin.auth.admin.getUserById(existingProfile.id);
      if (error || !data.user) return { error: 'Não foi possível validar a conta do responsável.' };
      existingAuthUser = data.user;
      if (!parent.profile_id && !existingProfile.active && !existingAuthUser.invited_at) {
        return { error: 'A conta encontrada ainda não foi convidada. Peça à administração para verificar o cadastro.' };
      }
      isRecovery = Boolean(existingAuthUser.email_confirmed_at);
    }

    const generatedResult = isRecovery
      ? await admin.auth.admin.generateLink({ type: 'recovery', email: parent.email, options: { redirectTo } })
      : await admin.auth.admin.generateLink({ type: 'invite', email: parent.email, options: { data: { full_name: parent.name }, redirectTo } });
    const { data: generated, error: linkError } = generatedResult;
    if (linkError || !generated.user || !generated.properties?.action_link) {
      if (process.env.NODE_ENV === 'development') console.error('Parent access link generation failed', linkError?.code);
      return { error: 'Não foi possível gerar o link de acesso.' };
    }

    userId = generated.user.id;
    actionLink = generated.properties.action_link;

    if (!existingProfile || !existingProfile.active) {
      const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...generated.user.app_metadata, role: 'parent' },
        user_metadata: { ...generated.user.user_metadata, full_name: parent.name },
      });
      if (roleError) {
        if (process.env.NODE_ENV === 'development') console.error('Parent role setup failed', roleError.code);
        return { error: 'Não foi possível preparar a conta do responsável.' };
      }
    }
  } else {
    const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(parent.email, {
      data: { full_name: parent.name },
      redirectTo,
    });

    if (inviteError || !invitation.user) {
      const message = inviteError?.message.toLowerCase() ?? '';
      if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
        return { error: 'Já existe uma conta com esse email. Use “Associar conta” para vinculá-la.' };
      }
      if (process.env.NODE_ENV === 'development') console.error('Parent invitation failed', inviteError?.code);
      return { error: 'Não foi possível enviar o convite. Confira o SMTP do Supabase Auth.' };
    }

    userId = invitation.user.id;
    const appMetadata = { ...invitation.user.app_metadata, role: 'parent' };
    const { error: roleError } = await admin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
    if (roleError) {
      if (process.env.NODE_ENV === 'development') console.error('Parent invitation role setup failed', roleError.code);
      return { error: 'O convite saiu, mas não foi possível preparar a conta. Contate a administração.' };
    }
    actionLink = '';
  }

  if (!parent.profile_id) {
    const { error: linkError } = await client.rpc('attach_parent_account', {
      p_parent_id: parent.id,
      p_email: parent.email,
    });
    if (linkError) {
      if (process.env.NODE_ENV === 'development') console.error('Parent invitation link failed', linkError.code);
      return { error: 'Não foi possível vincular a conta ao cadastro do responsável.' };
    }
  }

  if (directDelivery) {
    try {
      await sendAccountAccessEmail({ email: parent.email, name: parent.name, actionLink, isRecovery });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Parent invitation email failed', error instanceof Error ? error.name : 'UnknownError');
      }
      return { error: 'A conta foi vinculada, mas o email não foi enviado. Tente reenviar o link.' };
    }
  }

  revalidatePath('/teacher/parents', 'layout');
  revalidatePath('/parent');
  return { success: isRecovery ? 'Link para criar ou atualizar a senha enviado.' : 'Convite enviado. O responsável receberá um link para criar a senha.' };
}