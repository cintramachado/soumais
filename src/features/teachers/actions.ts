'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { teacherClassSchema, teacherSchema } from './schemas';

export type TeacherResult = { error?: string; success?: string };
export async function saveTeacher(input: unknown): Promise<TeacherResult> {
  const parsed = teacherSchema.safeParse(input);
  if (!parsed.success) return { error: 'Confira os dados do professor.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc('save_teacher', { p_id: parsed.data.id ?? null, p_name: parsed.data.name, p_email: parsed.data.email, p_phone: parsed.data.phone || null, p_active: parsed.data.active });
  if (error) return { error: error.code === '23505' ? 'Já existe professor com esse email na organização.' : 'Não foi possível salvar o professor.' };
  revalidatePath('/teacher/teachers', 'layout');
  revalidatePath('/teacher/classes', 'layout');
  return { success: 'Cadastro do professor salvo.' };
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