export default function TeachersLoading() {
  return <div role="status" aria-live="polite" className="space-y-4"><p className="text-sm text-muted-foreground">Carregando professores…</p><div aria-hidden="true" className="h-48 animate-pulse rounded-md bg-muted" /></div>;
}