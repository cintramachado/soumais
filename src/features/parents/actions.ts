'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { parentAccountSchema, parentLinkSchema, parentRemoveLinkSchema, parentSchema } from './schemas';

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