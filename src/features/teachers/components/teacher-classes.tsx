'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setTeacherClass } from '../actions';

type ClassOption = { id: string; name: string };
export function TeacherClasses({ teacherId, active, classes, linked }: { teacherId: string; active: boolean; classes: ClassOption[]; linked: ClassOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  function change(classId: string, remove: boolean) {
    if (!window.confirm(remove ? 'Remover o vínculo à turma? O professor perderá acesso a ela.' : 'Vincular o professor? Isso concede acesso à turma inteira quando sua conta estiver ativa.')) return;
    setError(''); setMessage('');
    startTransition(async () => {
      try {
        const result = await setTeacherClass({ teacherId, classId, remove });
        if (result.error) setError(result.error);
        else { setMessage(result.success ?? 'Salvo.'); setSelected(''); router.refresh(); }
      } catch { setError('Não foi possível atualizar o vínculo.'); }
    });
  }
  return <div className="space-y-4"><ul className="divide-y border-y">{linked.map((schoolClass) => <li key={schoolClass.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="break-words">{schoolClass.name}</span><Button type="button" variant="outline" size="icon" aria-label={`Remover vínculo com ${schoolClass.name}`} disabled={pending} onClick={() => change(schoolClass.id, true)}><Trash2 aria-hidden="true" /></Button></li>)}{!linked.length && <li className="py-4 text-sm text-muted-foreground">Nenhuma turma vinculada sob sua administração.</li>}</ul>
    {active && <div className="flex flex-wrap gap-3"><label className="min-w-0 flex-1 text-sm">Turma<select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-2 h-10 w-full min-w-0 rounded-md border bg-white px-3"><option value="">Selecione</option>{classes.filter((schoolClass) => !linked.some((value) => value.id === schoolClass.id)).map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label><Button type="button" disabled={pending || !selected} className="mt-7 min-h-10" onClick={() => change(selected, false)}>Vincular turma</Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
  </div>;
}