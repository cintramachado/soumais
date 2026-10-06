'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { taskDraftSchema, type TaskDraftValues } from '../schemas';
import { saveTaskDraft } from '../actions';
import { TaskRecipients, type Selection } from './task-recipients';

export type PeriodOption = { id: string; name: string; start_date: string; end_date: string };
export type TypeOption = { id: string; name: string; default_score: number };
const emptySelection: Selection = { classes: [], groups: [], students: [] };

export function TaskForm({ types, periods, draft, selection = emptySelection }: {
  types: TypeOption[];
  periods: PeriodOption[];
  draft?: TaskDraftValues;
  selection?: Selection;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(selection);
  const defaultPeriod = periods[0];
  const form = useForm<TaskDraftValues>({ resolver: zodResolver(taskDraftSchema), defaultValues: draft ?? {
    title: '', description: '', taskTypeId: types[0]?.id ?? '', periodId: defaultPeriod?.id ?? '',
    maximumScore: types[0]?.default_score ?? 0, startDate: defaultPeriod?.start_date ?? '', dueDate: defaultPeriod?.end_date ?? '',
    classIds: [], groupIds: [], studentIds: [],
  } });
  const periodId = useWatch({ control: form.control, name: 'periodId' });
  const typeId = useWatch({ control: form.control, name: 'taskTypeId' });
  const currentPeriod = periods.find((period) => period.id === periodId);
  function selectDestinations(value: Selection) {
    setSelected(value);
    form.setValue('classIds', value.classes.map((item) => item.id));
    form.setValue('groupIds', value.groups.map((item) => item.id));
    form.setValue('studentIds', value.students.map((item) => item.id));
  }
  function changePeriod(id: string) {
    if (selected.classes.length + selected.groups.length + selected.students.length > 0 && !window.confirm('Trocar o período e limpar os destinatários selecionados?')) return;
    selectDestinations(emptySelection);
    form.setValue('periodId', id);
    const period = periods.find((item) => item.id === id);
    form.setValue('startDate', period?.start_date ?? '');
    form.setValue('dueDate', period?.end_date ?? '');
  }
  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    startTransition(async () => {
      try {
        const result = await saveTaskDraft(values);
        if (result.error) form.setError('root', { message: result.error });
        else if (result.id) { router.push(`/teacher/tasks/${result.id}`); router.refresh(); }
      } catch { form.setError('root', { message: 'Não foi possível salvar. Tente novamente.' }); }
    });
  });
  return <form onSubmit={submit} noValidate className="space-y-6">
    <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-title">Título</Label><Input id="task-title" {...form.register('title')} maxLength={200} />{form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}</div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-description">Descrição</Label><textarea id="task-description" {...form.register('description')} rows={3} maxLength={5000} className="w-full rounded-md border bg-white p-3 text-sm" />{form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="task-type">Tipo</Label><select id="task-type" value={typeId} onChange={(event) => { form.setValue('taskTypeId', event.target.value); form.setValue('maximumScore', types.find((item) => item.id === event.target.value)?.default_score ?? 0); }} className="h-10 w-full min-w-0 rounded-md border bg-white px-2 text-sm">{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>{form.formState.errors.taskTypeId && <p className="text-sm text-destructive">{form.formState.errors.taskTypeId.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="task-score">Pontuação máxima</Label><Input id="task-score" type="number" min={0} step="0.01" {...form.register('maximumScore', { valueAsNumber: true })} />{form.formState.errors.maximumScore && <p className="text-sm text-destructive">Pontuação inválida.</p>}</div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-period">Período</Label><select id="task-period" value={periodId} onChange={(event) => changePeriod(event.target.value)} className="h-10 w-full min-w-0 rounded-md border bg-white px-2 text-sm">{periods.map((period) => <option key={period.id} value={period.id}>{period.name} ({period.start_date.slice(0, 4)})</option>)}</select>{form.formState.errors.periodId && <p className="text-sm text-destructive">{form.formState.errors.periodId.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="task-start">Data inicial</Label><Input id="task-start" type="date" min={currentPeriod?.start_date} max={currentPeriod?.end_date} {...form.register('startDate')} />{form.formState.errors.startDate && <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="task-due">Prazo</Label><Input id="task-due" type="date" min={currentPeriod?.start_date} max={currentPeriod?.end_date} {...form.register('dueDate')} />{form.formState.errors.dueDate && <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>}</div>
    </fieldset>
    <TaskRecipients key={periodId} periodId={periodId} selected={selected} onChange={selectDestinations} disabled={pending} />
    {(['classIds', 'groupIds', 'studentIds'] as const).map((key) => form.formState.errors[key]?.message && <p key={key} className="text-sm text-destructive">{form.formState.errors[key]?.message}</p>)}
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
    <Button type="submit" disabled={pending || !types.length || !periods.length} className="min-h-11">{pending ? 'Salvando…' : 'Salvar rascunho'}</Button>
  </form>;
}