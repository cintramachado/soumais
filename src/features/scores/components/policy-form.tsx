'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { scorePolicySchema } from '../schemas';
import { configureScorePolicy } from '../actions';

export function PolicyForm({ multiplier }: { multiplier?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof scorePolicySchema>>({ resolver: zodResolver(scorePolicySchema), defaultValues: { latePercentage: multiplier === undefined ? undefined : Math.round(multiplier * 10000) / 100 } });
  const submit = form.handleSubmit((values) => {
    if (!window.confirm('Aplicar este percentual às novas tarefas? Tarefas já criadas manterão a regra anterior.')) return;
    setMessage(''); form.clearErrors('root');
    startTransition(async () => {
      try {
        const result = await configureScorePolicy(values);
        if (result.error) form.setError('root', { message: result.error });
        else { setMessage(result.success ?? 'Salvo.'); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível salvar a configuração.' }); }
    });
  });
  return <form onSubmit={submit} noValidate className="space-y-4"><Label htmlFor="late-percentage">Pontos concedidos em atraso (%)</Label><Input id="late-percentage" type="number" min={0} max={100} step="0.01" disabled={pending} {...form.register('latePercentage', { valueAsNumber: true })} />{form.formState.errors.latePercentage && <p className="text-sm text-destructive">{form.formState.errors.latePercentage.message}</p>}<Button disabled={pending} className="min-h-10">{pending ? 'Salvando…' : 'Salvar regra para novas tarefas'}</Button>{form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}</form>;
}