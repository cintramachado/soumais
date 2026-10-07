'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dashboardMetricsSchema, type DashboardMetrics } from '../metrics-schema';

export function TeacherDashboardStats(props: { classId?: string; initial?: DashboardMetrics }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><Stats {...props} /></QueryClientProvider>;
}

function Stats({ classId, initial }: { classId?: string; initial?: DashboardMetrics }) {
  const query = useQuery({
    queryKey: ['teacher-dashboard', classId ?? 'all'], initialData: initial,
    refetchOnWindowFocus: true, refetchOnReconnect: false, staleTime: 0, retry: 1,
    queryFn: async ({ signal }) => {
      const url = `/api/dashboard/metrics${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`;
      const response = await fetch(url, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Falha ao atualizar os indicadores.');
      return dashboardMetricsSchema.parse(await response.json());
    },
  });
  const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const metrics = query.isError ? undefined : query.data;
  const cards = [
    ['Alunos ativos', metrics?.students], ['Tarefas abertas', metrics?.openTasks],
    ['Pendências', metrics?.pending], ['Aproveitamento', metrics?.achievementPercentage],
  ] as const;
  return <div className="mt-7 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{classId ? 'Turma selecionada' : 'Todas as turmas autorizadas · anos letivos ativos'}</span><Button type="button" variant="outline" size="icon" aria-label="Atualizar indicadores" title="Atualizar indicadores" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /></Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value], index) => <div key={label} className="border border-[#dce4de] bg-white p-5"><p className="text-sm text-[#667873]">{label}</p><p className="mt-4 text-2xl font-semibold text-[#315b51]">{value === undefined ? '—' : `${number.format(value)}${index === 3 ? '%' : ''}`}</p></div>)}</div>
    {query.isPending && <p role="status" className="text-sm text-muted-foreground">Carregando indicadores…</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar os indicadores. Tente novamente.</p>}
    {metrics && <p className="text-xs text-muted-foreground">Realizadas: {number.format(metrics.completedPercentage)}% · Pontos: {number.format(metrics.totalScore)} · Atualizado às {new Date(metrics.updatedAt).toLocaleTimeString('pt-BR')}</p>}
  </div>;
}