'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { linkParentStudent, unlinkParentStudent } from '../actions';
import { parentLinkSchema } from '../schemas';

export type StudentOption = { id: string; name: string };
export type ParentLink = { student_id: string; relationship_type: string; students: StudentOption };

export function ParentLinks({ parentId, students, links, active }: { parentId: string; students: StudentOption[]; links: ParentLink[]; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof parentLinkSchema>>({ resolver: zodResolver(parentLinkSchema), defaultValues: { parentId, studentId: '', relationship: '' } });
  const submit = form.handleSubmit((values) => {
    setMessage('');
    startTransition(async () => {
      try {
        const result = await linkParentStudent(values);
        if (result.error) form.setError('root', { message: result.error });
        else { setMessage('Vínculo salvo.'); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível salvar o vínculo.' }); }
    });
  });
  function remove(studentId: string) {
    if (!window.confirm('Remover o vínculo? O responsável deixará de ter acesso a este aluno.')) return;
    setMessage('');
    startTransition(async () => {
      try {
        const result = await unlinkParentStudent({ parentId, studentId });
        if (result.error) form.setError('root', { message: result.error });
        else { setMessage('Vínculo removido.'); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível remover o vínculo.' }); }
    });
  }
  return (
    <div className="space-y-5">
      <ul className="divide-y border-y">
        {links.map((link) => <li key={link.student_id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{link.students.name}</p><p className="text-xs text-muted-foreground">{link.relationship_type}</p></div><Button variant="outline" size="icon" title="Remover vínculo" aria-label={`Remover vínculo com ${link.students.name}`} disabled={pending} onClick={() => remove(link.student_id)}><Trash2 aria-hidden="true" /></Button></li>)}
        {!links.length && <li className="py-4 text-sm text-muted-foreground">Nenhum aluno vinculado.</li>}
      </ul>
      {active && <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="link-student">Aluno</Label><select id="link-student" className="h-10 w-full min-w-0 rounded-md border bg-white px-2 text-sm" {...form.register('studentId')}><option value="">Selecione</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>{form.formState.errors.studentId && <p className="text-sm text-destructive">{form.formState.errors.studentId.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="link-relationship">Parentesco</Label><Input id="link-relationship" placeholder="Ex.: mãe, pai, responsável legal" {...form.register('relationship')} maxLength={60} />{form.formState.errors.relationship && <p className="text-sm text-destructive">{form.formState.errors.relationship.message}</p>}</div>
        <div className="sm:col-span-2"><Button disabled={pending || !students.length} className="min-h-10">{pending ? 'Salvando…' : 'Salvar vínculo'}</Button></div>
      </form>}
      {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
    </div>
  );
}