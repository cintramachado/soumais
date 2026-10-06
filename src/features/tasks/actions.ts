'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { taskDraftSchema, taskStateSchema, taskTypeSchema } from './schemas';

export type TaskResult = { error?: string; success?: string };

export async function saveTaskType(input: unknown): Promise<TaskResult> {
  const parsed = taskTypeSchema.safeParse(input);
  if (!parsed.success) return { error: 'Confira o nome e a pontuação.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc('save_task_type', {
    p_id: parsed.data.id ?? null, p_name: parsed.data.name, p_description: parsed.data.description,
    p_score: parsed.data.defaultScore, p_active: parsed.data.active,
  });
  if (error) return { error: 'Não foi possível salvar o tipo. Verifique se o nome já existe.' };
  revalidatePath('/teacher/task-types');
  return { success: 'Tipo de tarefa salvo.' };
}

export async function saveTaskDraft(input: unknown): Promise<TaskResult> {
  const parsed = taskDraftSchema.safeParse(input);
  if (!parsed.success) return { error: 'Confira os campos e os destinatários.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { id, ...values } = parsed.data;
  const { data, error } = await client.rpc('save_task_draft', { p_task: values, p_id: id ?? null });
  if (error) {
    if (process.env.NODE_ENV === 'development') console.error('Task draft failed', error.code);
    return { error: 'Não foi possível salvar. Confira o período, as datas e os destinatários.' };
  }
  revalidatePath('/teacher/tasks', 'layout');
  redirect(`/teacher/tasks/${data}`);
}

export async function publishTask(input: unknown): Promise<TaskResult> {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return { error: 'Tarefa inválida.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { data, error } = await client.rpc('publish_task', { p_task_id: parsed.data });
  if (error) return { error: 'Não foi possível publicar. Confira se há alunos ativos e se os destinos continuam disponíveis.' };
  revalidatePath('/teacher/tasks', 'layout');
  return { success: `Tarefa publicada para ${data} aluno(s).` };
}

export async function changeTaskState(input: unknown): Promise<TaskResult> {
  const parsed = taskStateSchema.safeParse(input);
  if (!parsed.success) return { error: 'Operação inválida.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc('change_task_state', { p_task_id: parsed.data.id, p_state: parsed.data.state });
  if (error) return { error: 'Não foi possível alterar a tarefa.' };
  revalidatePath('/teacher/tasks', 'layout');
  return { success: 'Situação atualizada.' };
}