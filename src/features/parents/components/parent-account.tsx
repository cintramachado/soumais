'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { attachParentAccount, inviteParentAccount } from '../actions';
import { parentAccountSchema } from '../schemas';

export function ParentAccount({ parentId, email = '', alreadyLinked = false }: { parentId: string; email?: string; alreadyLinked?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const form = useForm<z.infer<typeof parentAccountSchema>>({ resolver: zodResolver(parentAccountSchema), defaultValues: { parentId, email } });
  const sendInvite = () => {
    setInviteError('');
    setInviteMessage('');
    if (!email) {
      setInviteError('Salve um email de contato no cadastro antes de enviar o convite.');
      return;
    }
    const confirmation = alreadyLinked
      ? `Enviar um link para ${email} criar ou atualizar a senha?`
      : `Enviar convite para ${email} criar a senha de acesso?`;
    if (!window.confirm(confirmation)) return;
    startTransition(async () => {
      try {
        const result = await inviteParentAccount({ parentId });
        if (result.error) setInviteError(result.error);
        else { setInviteMessage(result.success ?? 'Convite enviado.'); router.refresh(); }
      } catch {
        setInviteError('Não foi possível enviar o convite. Tente novamente.');
      }
    });
  };
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
  return <div className="space-y-6">
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">{alreadyLinked ? 'Enviar link de senha' : 'Enviar acesso inicial'}</h3>
        <p className="mt-1 break-all text-sm text-muted-foreground">{email || 'Cadastre e salve um email de contato primeiro.'}</p>
      </div>
      <Button type="button" disabled={pending || !email} onClick={sendInvite} className="min-h-10">
        {pending ? 'Enviando link…' : alreadyLinked ? 'Reenviar link para senha' : 'Enviar convite para criar senha'}
      </Button>
      {inviteError && <p role="alert" className="text-sm text-destructive">{inviteError}</p>}
      {inviteMessage && <p role="status" className="text-sm text-primary">{inviteMessage}</p>}
    </section>
    {!alreadyLinked && <form onSubmit={submit} noValidate className="space-y-3 border-t pt-5">
      <h3 className="font-medium">Associar uma conta existente</h3>
      <Label htmlFor="parent-account-email">Email da conta de responsável</Label>
      <Input id="parent-account-email" type="email" {...form.register('email')} />
      {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
      <Button type="submit" disabled={pending} className="min-h-10">{pending ? 'Associando…' : 'Associar conta'}</Button>
      {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
    </form>}
  </div>;
}