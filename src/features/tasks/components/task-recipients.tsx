'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Destination = { id: string; name: string };
export type Selection = { classes: Destination[]; groups: Destination[]; students: Destination[] };
type Kind = keyof Selection;
const labels: Record<Kind, string> = { classes: 'Turmas', groups: 'Grupos', students: 'Alunos' };

export function TaskRecipients(props: { periodId: string; selected: Selection; onChange: (value: Selection) => void; disabled: boolean }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 0, gcTime: 60000 } } }));
  return <QueryClientProvider client={client}><RecipientPicker {...props} /></QueryClientProvider>;
}

function RecipientPicker({ periodId, selected, onChange, disabled }: { periodId: string; selected: Selection; onChange: (value: Selection) => void; disabled: boolean }) {
  const [kind, setKind] = useState<Kind>('classes');
  const [contextClass, setContextClass] = useState<Destination | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const result = useQuery<{ items: Destination[]; count: number }>({
    queryKey: ['task-recipients', periodId, kind, contextClass?.id, page, query],
    enabled: Boolean(periodId) && (kind === 'classes' || Boolean(contextClass)),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ periodId, kind, page: String(page), q: query });
      if (contextClass) params.set('classId', contextClass.id);
      const response = await fetch(`/api/task-recipients?${params}`, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar os destinatários.');
      return response.json();
    },
  });
  function toggle(destination: Destination) {
    const values = selected[kind];
    onChange({ ...selected, [kind]: values.some((value) => value.id === destination.id) ? values.filter((value) => value.id !== destination.id) : [...values, destination] });
  }
  return <fieldset disabled={disabled} className="min-w-0 space-y-4 border-y py-5">
    <legend className="text-base font-semibold">Destinatários</legend>
    <div aria-label="Tipo de destinatário" className="flex flex-wrap gap-2">{(['classes', 'groups', 'students'] as const).map((value) => <Button key={value} type="button" variant={kind === value ? 'default' : 'outline'} aria-pressed={kind === value} onClick={() => { setKind(value); setPage(1); setQuery(''); }} className="min-h-10">{labels[value]}</Button>)}</div>
    {kind !== 'classes' && <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{contextClass?.name ?? 'Nenhuma turma selecionada'}</span><Button type="button" variant="outline" onClick={() => { setKind('classes'); setPage(1); setQuery(''); }}>Escolher turma</Button></div>}
    <label className="block text-sm">Buscar {labels[kind].toLowerCase()}<input maxLength={120} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="mt-2 h-10 w-full min-w-0 rounded-md border bg-white px-3" /></label>
    {!periodId ? <p className="text-sm text-muted-foreground">Selecione um período.</p> : kind !== 'classes' && !contextClass ? <p className="text-sm text-muted-foreground">Selecione uma turma para consultar grupos ou alunos.</p> : result.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando…</p> : result.isError ? <div role="alert" className="text-sm text-destructive">Não foi possível carregar os destinatários. <Button type="button" variant="outline" onClick={() => void result.refetch()}>Tentar novamente</Button></div> : <>
      <ul className="divide-y">{result.data?.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><label className="flex min-h-10 min-w-0 items-center gap-2 text-sm"><input type="checkbox" checked={selected[kind].some((value) => value.id === item.id)} onChange={() => toggle(item)} /><span className="break-words">{item.name}</span></label>{kind === 'classes' && <Button type="button" variant="outline" onClick={() => { setContextClass(item); setKind('groups'); setQuery(''); setPage(1); }}>Grupos e alunos</Button>}</li>)}{!result.data?.items.length && <li className="py-3 text-sm text-muted-foreground">Nenhum destinatário encontrado.</li>}</ul>
      <div className="flex items-center justify-between"><Button type="button" variant="outline" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></Button><span className="text-sm">Página {page}</span><Button type="button" variant="outline" aria-label="Próxima página" disabled={page * 20 >= (result.data?.count ?? 0)} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></Button></div>
    </>}
    <div className="space-y-2 border-t pt-4"><p className="text-sm font-medium">Selecionados</p>{(['classes', 'groups', 'students'] as const).map((value) => <div key={value} className="flex flex-wrap gap-2">{selected[value].map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-2 rounded-md bg-muted px-2 py-1 text-sm"><span className="min-w-0 break-words">{labels[value]}: {item.name}</span><button type="button" aria-label={`Remover ${item.name}`} onClick={() => onChange({ ...selected, [value]: selected[value].filter((destination) => destination.id !== item.id) })} className="grid size-8 shrink-0 place-items-center rounded-sm"><X className="size-4" aria-hidden="true" /></button></span>)}</div>)}</div>
  </fieldset>;
}