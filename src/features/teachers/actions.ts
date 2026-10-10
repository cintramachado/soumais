'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { buildAppUrl } from '@/lib/app-url';
import { requireProfile } from '@/lib/auth/profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendAccountCredentials } from '@/lib/auth/account-credentials';
import { teacherClassSchema, teacherInviteSchema, teacherSchema } from './schemas';

export type TeacherResult = { error?: string; success?: string; id?: string };
export async function saveTeacher(input: unknown): Promise<TeacherResult> {
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { error: 'Confira os dados do professor.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { data, error } = await client.rpc('save_teacher', { p_id: parsed.data.id ?? null, p_name: parsed.data.name, p_email: parsed.data.email, p_phone: parsed.data.phone || null, p_active: parsed.data.active });
  if (error) return { error: error.code === '23505' ? 'Já existe professor com esse email na organização.' : 'Não foi possível salvar o professor.' };
  revalidatePath('/teacher/teachers', 'layout');
  revalidatePath('/teacher/classes', 'layout');
  return { success: 'Cadastro do professor salvo.', id: data as string };
}

export async function inviteTeacherAccount(input: unknown): Promise<TeacherResult> {
  const parsed = teacherInviteSchema.safeParse(input);
  if (!parsed.success) return { error: 'Cadastro de professor inválido.' };
  const currentProfile = await requireProfile('teacher');
  const client = await createClient();
  const { data: teacher, error: teacherError } = await client.from('teachers')
    .select('id,name,email,active,profile_id,organization_id')
    .eq('id', parsed.data.teacherId).maybeSingle();
  if (teacherError || !teacher || teacher.organization_id !== currentProfile.organizationId) {
    return { error: 'Não foi possível localizar este professor.' };
  }
  if (!teacher.active) return { error: 'Ative o cadastro antes de enviar o convite.' };
  if (!teacher.email) return { error: 'Cadastre um email antes de enviar o convite.' };

  let admin;
  try { admin = createAdminClient(); }
  catch { return { error: 'A chave administrativa do Supabase não está configurada no servidor.' }; }

  const { data: account, error: accountError } = await admin.from('profiles').select('id,email,role,active')
    .eq('email', teacher.email.toLowerCase()).maybeSingle();
  if (accountError) return { error: 'Não foi possível validar a conta do professor.' };
  if (account && (account.role !== 'teacher' || !account.active)) {
    return { error: 'Já existe uma conta com esse email que não está provisionada como professor ativo.' };
  }
  if (teacher.profile_id && (!account || account.id !== teacher.profile_id)) {
    return { error: 'O email do cadastro não corresponde à conta vinculada.' };
  }

  if (account && !teacher.profile_id) {
    const { error } = await client.rpc('attach_teacher_account', { p_teacher_id: teacher.id, p_email: teacher.email });
    if (error) return { error: 'Não foi possível vincular a conta existente ao professor.' };
  }

  const result = await sendAccountCredentials({
    email: teacher.email,
    name: teacher.name,
    role: 'teacher',
    redirectTo: buildAppUrl('/auth/invite'),
    isRecovery: Boolean(account?.active),
  });
  if (result.error) return { error: result.error === 'account_exists'
    ? 'Já existe uma conta com esse email. Atualize a página e tente reenviar o acesso.'
    : 'Não foi possível enviar o acesso. Confira o SMTP e tente novamente.' };

  revalidatePath('/teacher/teachers', 'layout');
  revalidatePath('/teacher/classes', 'layout');
  return { success: account ? 'Link para criar ou atualizar a senha enviado.' : 'Convite enviado ao professor.' };
}

export async function deleteTeacher(input: unknown): Promise<TeacherResult> {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return { error: 'Professor inválido.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc('delete_teacher', { p_id: parsed.data });
  if (error) {
    if (error.code === '23503') return { error: 'Não é possível apagar: professor tem tarefas ou é responsável por um grupo.' };
    if (error.code === '42501') return { error: 'Não é possível apagar o próprio cadastro.' };
    return { error: 'Não foi possível apagar o professor.' };
  }
  revalidatePath('/teacher/teachers', 'layout');
  revalidatePath('/teacher/classes', 'layout');
  return { success: 'Professor apagado.' };
}

export async function setTeacherClass(input: unknown): Promise<TeacherResult> {
  const parsed = teacherClassSchema.safeParse(input);
  if (!parsed.success) return { error: 'Selecione uma turma válida.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc('set_teacher_class', { p_teacher_id: parsed.data.teacherId, p_class_id: parsed.data.classId, p_remove: parsed.data.remove });
  if (error) return { error: error.code === '23503' ? 'Este professor é responsável por um grupo. Troque o responsável do grupo antes de remover o vínculo.' : 'Não foi possível alterar o vínculo à turma.' };
  revalidatePath('/teacher/teachers', 'layout');
  revalidatePath('/teacher/classes', 'layout');
  return { success: 'Vínculo atualizado.' };
}