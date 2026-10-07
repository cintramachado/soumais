export default function ScoreLoading() {
  return <div role="status" aria-live="polite" className="space-y-5"><p className="text-sm text-muted-foreground">Carregando pontuação…</p><div aria-hidden="true" className="h-12 animate-pulse rounded-md bg-muted" /><div aria-hidden="true" className="h-48 animate-pulse rounded-md bg-muted" /></div>;
}