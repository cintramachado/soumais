'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteTaskType } from '../actions';

export function DeleteTaskTypeButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function remove() {
    if (!window.confirm(`Apagar o tipo "${name}"? Esta ação não pode ser desfeita.`)) return;
    setError('');
    startTransition(async () => {
      const result = await deleteTaskType(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={remove} aria-label={`Apagar tipo ${name}`} className="min-h-9 rounded-md">
        {pending ? 'Apagando…' : 'Apagar tipo'}
      </Button>
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
