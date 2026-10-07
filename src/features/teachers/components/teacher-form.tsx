'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountCredentialsButton } from '@/features/auth/components/account-credentials-button';
import { saveTeacher } from '../actions';
import { teacherSchema } from '../schemas';

export type TeacherRecord = { id: string; name: string; email: string; phone: string | null; active: boolean; profile_id: string | null };
export function TeacherForm({ teacher }: { teacher?: TeacherRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [newTeacher, setNewTeacher] = useState<{ id: string; name: string; email: string } | null>(null);
  const form = useForm<z.infer<typeof teacherSchema>>({ resolver: zodResolver(teacherSchema), defaultValues: { id: teacher?.id, name: teacher?.name ?? '', email: teacher?.email ?? '', phone: teacher?.phone ?? '', active: teacher?.active ?? true } });
  const submit = form.handleSubmit((values) => {
    if (teacher?.active && !values.active && !window.confirm('Inativar este professor? O acesso administrativo será bloqueado e o histórico preservado.')) return;
    setMessage(''); form.clearErrors('root');
    startTransition(async () => {
      try {
        const result = await saveTeacher(values);
        if (result.error) form.setError('root', { message: result.error });
        else {
          setMessage(result.success ?? 'Salvo.');
          if (!teacher) {
            if (result.id) setNewTeacher({ id: result.id, name: values.name, email: values.email });
            form.reset({ name: '', email: '', phone: '', active: true });
          }
          router.refresh();
        }
      } catch { form.setError('root', { message: 'Não foi possível salvar. Tente novamente.' }); }
    });
  });
  const suffix = teacher?.id ?? 'new';
  return <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor={`teacher-name-${suffix}`}>Nome</Label><Input id={`teacher-name-${suffix}`} {...form.register('name')} maxLength={120} />{form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor={`teacher-email-${suffix}`}>Email</Label><Input id={`teacher-email-${suffix}`} type="email" readOnly={Boolean(teacher?.profile_id)} {...form.register('email')} />{form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor={`teacher-phone-${suffix}`}>Telefone (opcional)</Label><Input id={`teacher-phone-${suffix}`} type="tel" {...form.register('phone')} maxLength={30} /></div>
    {teacher && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" {...form.register('active')} />Professor ativo</label>}
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
      <Button type="submit" disabled={pending} className="min-h-10">{pending ? 'Salvando…' : 'Salvar professor'}</Button>
      {teacher && <AccountCredentialsButton recordId={teacher.id} email={teacher.email} active={teacher.active} linked={Boolean(teacher.profile_id)} kind="teacher" />}
      {!teacher && newTeacher && <div className="space-y-2">
        <p role="status" className="text-sm text-primary">{newTeacher.name} foi cadastrado.</p>
        <AccountCredentialsButton recordId={newTeacher.id} email={newTeacher.email} active linked={false} kind="teacher" />
      </div>}
    </div>
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>}
    {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
  </form>;
}