'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { saveParent } from '../actions';
import { parentSchema } from '../schemas';

export type ParentRecord = { id: string; name: string; phone: string | null; active: boolean; profile_id: string | null };

export function ParentForm({ parent }: { parent?: ParentRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof parentSchema>>({
    resolver: zodResolver(parentSchema),
    defaultValues: { id: parent?.id, name: parent?.name ?? '', phone: parent?.phone ?? '', active: parent?.active ?? true },
  });
  const submit = form.handleSubmit((values) => {
    if (parent?.active && !values.active && !window.confirm('Inativar este responsável? Seu acesso aos alunos será bloqueado.')) return;
    setMessage('');
    startTransition(async () => {
      try {
        const result = await saveParent(values);
        if (result.error) form.setError('root', { message: result.error });
        else {
          setMessage(result.success ?? 'Salvo.');
          if (!parent) form.reset({ name: '', phone: '', active: true });
          router.refresh();
        }
      } catch {
        form.setError('root', { message: 'Não foi possível salvar. Tente novamente.' });
      }
    });
  });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`parent-name-${parent?.id ?? 'new'}`}>Nome completo</Label>
        <Input id={`parent-name-${parent?.id ?? 'new'}`} {...form.register('name')} maxLength={120} />
        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`parent-phone-${parent?.id ?? 'new'}`}>Telefone (opcional)</Label>
        <Input id={`parent-phone-${parent?.id ?? 'new'}`} type="tel" {...form.register('phone')} maxLength={30} />
        {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
      </div>
      {parent && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" {...form.register('active')} />Responsável ativo</label>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="min-h-10">{pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}{parent ? 'Salvar alterações' : 'Cadastrar responsável'}</Button>
      </div>
      {form.formState.errors.root && <p role="alert" className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>}
      {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
    </form>
  );
}