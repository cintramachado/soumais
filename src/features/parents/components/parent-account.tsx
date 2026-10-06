'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { attachParentAccount } from '../actions';
import { parentAccountSchema } from '../schemas';

export function ParentAccount({ parentId }: { parentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof parentAccountSchema>>({ resolver: zodResolver(parentAccountSchema), defaultValues: { parentId, email: '' } });
  const submit = form.handleSubmit((values) => {
    if (!window.confirm('Associar esta conta? Ela poderá consultar todos os alunos vinculados a este responsável.')) return;
    startTransition(async () => {
      try {
        const result = await attachParentAccount(values);
        if (result.error) form.setError('root', { message: result.error });
        else { setMessage('Conta associada.'); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível associar a conta.' }); }
    });
  });
  return <form onSubmit={submit} noValidate className="space-y-3"><Label htmlFor="parent-account-email">Email da conta de responsável</Label><Input id="parent-account-email" type="email" {...form.register('email')} />{form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}<Button disabled={pending} className="min-h-10">{pending ? 'Associando…' : 'Associar conta'}</Button>{form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}</form>;
}