export default function TasksLoading() {
  return <div role="status" aria-live="polite" className="space-y-5"><p className="text-sm text-muted-foreground">Carregando tarefas…</p><div aria-hidden="true" className="h-12 animate-pulse rounded-md bg-muted" /><div aria-hidden="true" className="h-48 animate-pulse rounded-md bg-muted" /></div>;
}