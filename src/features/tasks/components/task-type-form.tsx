'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { taskTypeSchema } from '../schemas';
import { saveTaskType } from '../actions';

export type TaskTypeOption = { id: string; name: string; description: string | null; default_score: number; active: boolean };

export function TaskTypeForm({ taskType }: { taskType?: TaskTypeOption }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof taskTypeSchema>>({ resolver: zodResolver(taskTypeSchema), defaultValues: {
    id: taskType?.id, name: taskType?.name ?? '', description: taskType?.description ?? '', defaultScore: taskType?.default_score ?? 0, active: taskType?.active ?? true,
  } });
  const submit = form.handleSubmit((values) => {
    if (taskType?.active && !values.active && !window.confirm('Inativar o tipo? As tarefas existentes serão preservadas.')) return;
    setMessage('');
    form.clearErrors('root');
    startTransition(async () => {
      try {
        const result = await saveTaskType(values);
        if (result.error) form.setError('root', { message: result.error });
        else { setMessage(result.success ?? 'Salvo.'); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível salvar o tipo. Tente novamente.' }); }
    });
  });
  const suffix = taskType?.id ?? 'new';
  return <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor={`type-name-${suffix}`}>Nome</Label><Input id={`type-name-${suffix}`} {...form.register('name')} maxLength={120} />{form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor={`type-score-${suffix}`}>Pontuação padrão</Label><Input id={`type-score-${suffix}`} type="number" min={0} step="0.01" {...form.register('defaultScore', { valueAsNumber: true })} />{form.formState.errors.defaultScore && <p className="text-sm text-destructive">{form.formState.errors.defaultScore.message}</p>}</div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor={`type-description-${suffix}`}>Descrição</Label><Input id={`type-description-${suffix}`} {...form.register('description')} maxLength={2000} /></div>
    {taskType && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" {...form.register('active')} />Tipo ativo</label>}
    <div className="sm:col-span-2"><Button disabled={pending} className="min-h-10">{pending ? 'Salvando…' : 'Salvar tipo'}</Button></div>
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>}
    {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
  </form>;
}