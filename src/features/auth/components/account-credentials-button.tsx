'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { inviteTeacherAccount } from '@/features/teachers/actions';
import { inviteStudentAccount } from '@/features/school/actions';

export function AccountCredentialsButton({
  recordId,
  email,
  active,
  linked,
  kind,
}: {
  recordId: string;
  email: string | null;
  active: boolean;
  linked: boolean;
  kind: 'teacher' | 'student';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLinked, setIsLinked] = useState(linked);

  const send = () => {
    setMessage('');
    setError('');
    const actionText = isLinked ? 'Enviar link para criar ou atualizar a senha' : 'Enviar convite para criar a senha';
    if (!window.confirm(`${actionText} para ${email}?`)) return;

    startTransition(async () => {
      try {
        const result = kind === 'teacher'
          ? await inviteTeacherAccount({ teacherId: recordId })
          : await inviteStudentAccount({ studentId: recordId });
        if (result.error) setError(result.error);
        else {
          setMessage(result.success ?? 'Email enviado.');
          setIsLinked(true);
          router.refresh();
        }
      } catch {
        setError('Não foi possível enviar o acesso. Tente novamente.');
      }
    });
  };

  return <div className="space-y-2">
    <Button type="button" variant="outline" disabled={!active || !email || pending} onClick={send}>
      {pending ? 'Enviando…' : isLinked ? 'Reenviar link de senha' : 'Enviar convite para criar senha'}
    </Button>
    {!email && <p className="text-xs text-muted-foreground">Cadastre um email para liberar o acesso.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
  </div>;
}