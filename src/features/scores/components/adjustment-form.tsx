'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adjustScore } from '../actions';
import { adjustmentSchema } from '../schemas';

export function AdjustmentForm({ id, maximumScore, manualScore, calculatedScore }: { id: string; maximumScore: number; manualScore: number | null; calculatedScore: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof adjustmentSchema>>({ resolver: zodResolver(adjustmentSchema), defaultValues: { id, manualScore: manualScore ?? calculatedScore, reason: '', remove: false } });
  const remove = useWatch({ control: form.control, name: 'remove' });
  const submit = form.handleSubmit((values) => {
    if (!values.remove && (values.manualScore ?? 0) > maximumScore) { form.setError('manualScore', { message: 'O ajuste não pode ultrapassar o máximo da tarefa.' }); return; }
    if (values.remove && !window.confirm('Remover o ajuste e restaurar a pontuação calculada? O histórico será preservado.')) return;
    setMessage(''); form.clearErrors('root');
    startTransition(async () => {
      try {
        const result = await adjustScore(values);
        if (result.error) form.setError('root', { message: result.error });
        else {
          setMessage(result.success ?? 'Salvo.');
          form.reset({ id, remove: false, manualScore: values.remove ? calculatedScore : values.manualScore, reason: '' });
          router.refresh();
        }
      } catch { form.setError('root', { message: 'Não foi possível ajustar. Tente novamente.' }); }
    });
  });
  return <form onSubmit={submit} noValidate className="space-y-4">
    {manualScore !== null && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={remove} disabled={pending} onChange={(event) => { form.setValue('remove', event.target.checked); form.setValue('manualScore', event.target.checked ? undefined : manualScore); }} />Remover ajuste manual</label>}
    {!remove && <div className="space-y-2"><Label htmlFor="manual-score">Pontuação ajustada</Label><Input id="manual-score" type="number" min={0} max={maximumScore} step="0.01" disabled={pending} {...form.register('manualScore', { valueAsNumber: true })} />{form.formState.errors.manualScore && <p className="text-sm text-destructive">{form.formState.errors.manualScore.message}</p>}</div>}
    <div className="space-y-2"><Label htmlFor="manual-reason">Motivo obrigatório</Label><textarea id="manual-reason" {...form.register('reason')} disabled={pending} maxLength={2000} rows={3} className="w-full rounded-md border bg-white p-3 text-sm" />{form.formState.errors.reason && <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>}</div>
    <Button type="submit" disabled={pending} className="min-h-10">{pending ? 'Salvando…' : remove ? 'Remover ajuste' : 'Salvar ajuste'}</Button>
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
  </form>;
}