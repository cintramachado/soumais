'use server';

import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { adjustmentSchema, resultSchema, scorePolicySchema } from './schemas';

export type ScoreResult = { error?: string; success?: string };

async function runScoreMutation(name: string, values: Record<string, unknown>): Promise<ScoreResult> {
  await requireProfile('teacher');
  const client = await createClient();
  const { data, error } = await client.rpc(name, values);
  if (error) {
    if (process.env.NODE_ENV === 'development') console.error('Score operation failed', error.code);
    return { error: 'Não foi possível salvar. Confira a data, a situação e a pontuação.' };
  }
  revalidatePath('/teacher/tasks', 'layout');
  revalidatePath('/teacher/scores', 'layout');
  return { success: `Salvo. Pontuação atual: ${Number(data).toLocaleString('pt-BR')}.` };
}

export async function recordResult(input: unknown): Promise<ScoreResult> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { error: 'Confira a situação e a data de realização.' };
  return runScoreMutation('record_student_task', {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    p_completed_date: ['completed_on_time', 'completed_late'].includes(parsed.data.status) ? parsed.data.completedDate : null,
  });
}

export async function adjustScore(input: unknown): Promise<ScoreResult> {
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) return { error: 'Informe a pontuação e o motivo do ajuste.' };
  return runScoreMutation('adjust_student_task_score', {
    p_id: parsed.data.id, p_manual_score: parsed.data.remove ? null : parsed.data.manualScore, p_reason: parsed.data.reason,
  });
}

export async function configureScorePolicy(input: unknown): Promise<ScoreResult> {
  const parsed = scorePolicySchema.safeParse(input);
  if (!parsed.success) return { error: 'Informe um percentual de 0 a 100.' };
  await requireProfile('teacher');
  const client = await createClient();
  const { error } = await client.rpc('configure_late_multiplier', { p_multiplier: Math.round(parsed.data.latePercentage * 100) / 10000 });
  if (error) return { error: 'Não foi possível salvar a configuração.' };
  revalidatePath('/teacher/score-settings');
  return { success: 'Configuração salva. Tarefas anteriores mantêm sua regra.' };
}