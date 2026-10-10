'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteTeacher } from '../actions';

export function DeleteTeacherButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function remove() {
    if (!window.confirm(`Apagar o professor "${name}"? Esta ação não pode ser desfeita.`)) return;
    setError('');
    startTransition(async () => {
      const result = await deleteTeacher(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={remove} aria-label={`Apagar professor ${name}`} className="min-h-9 rounded-md">
        {pending ? 'Apagando…' : 'Apagar'}
      </Button>
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
