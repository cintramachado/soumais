'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { recordResult } from '../actions';
import { resultSchema } from '../schemas';
import { calculateTaskScore, type ResultStatus } from '../domain/score-calculator';
import { resultLabels } from '../labels';

export function ResultForm({ id, status, completedDate, startDate, dueDate, maximumScore, lateMultiplier, manualScore }: {
  id: string; status: ResultStatus; completedDate: string; startDate: string; dueDate: string; maximumScore: number; lateMultiplier: number; manualScore: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof resultSchema>>({ resolver: zodResolver(resultSchema), defaultValues: { id, status, completedDate } });
  const selectedStatus = useWatch({ control: form.control, name: 'status' });
  const isCompleted = selectedStatus === 'completed_on_time' || selectedStatus === 'completed_late';
  const preview = calculateTaskScore({ maximumScore, status: selectedStatus, lateMultiplier, manualScore });
  const submit = form.handleSubmit((values) => {
    setMessage(''); form.clearErrors('root');
    startTransition(async () => {
      try {
        const result = await recordResult(values);
        if (result.error) form.setError('root', { message: result.error });
        else { setMessage(result.success ?? 'Salvo.'); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível registrar. Tente novamente.' }); }
    });
  });
  return <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="result-status">Situação</Label><select id="result-status" {...form.register('status')} disabled={pending} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {isCompleted && <div className="space-y-2"><Label htmlFor="result-date">Data de realização</Label><Input id="result-date" type="date" disabled={pending} min={selectedStatus === 'completed_late' ? format(addDays(parseISO(dueDate), 1), 'yyyy-MM-dd') : startDate} max={selectedStatus === 'completed_on_time' ? dueDate : undefined} {...form.register('completedDate')} />{form.formState.errors.completedDate && <p className="text-sm text-destructive">{form.formState.errors.completedDate.message}</p>}</div>}
    <output className="text-sm sm:col-span-2">Pontuação: {preview.toLocaleString('pt-BR')}{manualScore !== null ? ' (ajuste manual vigente)' : ''}</output>
    <div className="sm:col-span-2"><Button disabled={pending} className="min-h-10">{pending ? 'Salvando…' : 'Registrar resultado'}</Button></div>
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>}
    {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
  </form>;
}