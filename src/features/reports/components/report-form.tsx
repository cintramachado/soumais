'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { reportFilterSchema } from '../schemas';

export function ReportForm({ classId, groups, periods }: { classId: string; groups: { id: string; name: string }[]; periods: { id: string; name: string }[] }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const form = useForm<z.infer<typeof reportFilterSchema>>({ resolver: zodResolver(reportFilterSchema), defaultValues: { classId, periodId: '', groupId: '' } });
  const submit = form.handleSubmit(async (values) => {
    if (!navigator.onLine) { form.setError('root', { message: 'Sem conexão. Conecte-se para gerar o relatório atualizado.' }); return; }
    setPending(true); setMessage(''); form.clearErrors('root');
    try {
      const filters = new URLSearchParams({ classId: values.classId, periodId: values.periodId ?? '', groupId: values.groupId ?? '' });
      const response = await fetch(`/api/reports/class?${filters}`, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        form.setError('root', { message: result.error ?? 'Não foi possível gerar o relatório.' });
        return;
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'soulmais-relatorio-pontos.pdf';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('PDF gerado com a pontuação vigente.');
    } catch { form.setError('root', { message: 'Não foi possível gerar o relatório. Tente novamente.' }); }
    finally { setPending(false); }
  });
  return <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="report-period">Período</Label><select id="report-period" disabled={pending} {...form.register('periodId')} className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm"><option value="">Ano letivo completo</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="report-group">Grupo</Label><select id="report-group" disabled={pending} {...form.register('groupId')} className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm"><option value="">Todos os grupos</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
    <div className="sm:col-span-2"><Button type="submit" disabled={pending} className="min-h-11">{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}{pending ? 'Gerando…' : 'Gerar relatório'}</Button></div>
    {form.formState.errors.root && <p role="alert" className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>}
    {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
  </form>;
}