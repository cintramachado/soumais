'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Ban, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publishTask, changeTaskState } from '../actions';

export function TaskControls({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function act(action: 'publish' | 'cancelled' | 'closed') {
    const prompt = action === 'publish' ? 'Publicar tarefa e gerar atribuições para os alunos ativos dos destinos selecionados?' : action === 'cancelled' ? 'Cancelar a tarefa? O histórico será preservado.' : 'Encerrar a tarefa?';
    if (!window.confirm(prompt)) return;
    setMessage(''); setError('');
    startTransition(async () => {
      try {
        const result = action === 'publish' ? await publishTask(id) : await changeTaskState({ id, state: action });
        if (result.error) setError(result.error);
        else { setMessage(result.success ?? 'Salvo.'); router.refresh(); }
      } catch { setError('Não foi possível atualizar a tarefa.'); }
    });
  }
  return <div className="space-y-3"><div className="flex flex-wrap gap-2">
    {status === 'draft' && <Button disabled={pending} onClick={() => act('publish')} className="min-h-10"><Send aria-hidden="true" />Publicar</Button>}
    {status === 'active' && <Button variant="outline" disabled={pending} onClick={() => act('closed')} className="min-h-10"><Check aria-hidden="true" />Encerrar</Button>}
    {['draft', 'active'].includes(status) && <Button variant="outline" disabled={pending} onClick={() => act('cancelled')} className="min-h-10"><Ban aria-hidden="true" />Cancelar tarefa</Button>}
  </div>{pending && <p role="status" className="text-sm text-muted-foreground">Salvando…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}</div>;
}