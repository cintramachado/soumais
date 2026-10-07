import { requireProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { PolicyForm } from '@/features/scores/components/policy-form';
import { SchoolLoadError } from '@/features/school/components/school-empty-state';

export default async function ScoreSettingsPage() {
  await requireProfile('teacher');
  const client = await createClient();
  const { data, error } = await client.from('score_policies').select('late_multiplier').eq('name', 'Default').is('school_year_id', null).maybeSingle();
  if (error) return <SchoolLoadError />;
  return <div className="space-y-6"><header className="border-b pb-5"><h1 className="text-2xl font-semibold">Regras de pontuação</h1></header><section className="max-w-xl space-y-4"><h2 className="text-lg font-semibold">Pontuação com atraso</h2>{!data && <p className="text-sm text-muted-foreground">Nenhuma regra padrão cadastrada.</p>}<PolicyForm multiplier={data?.late_multiplier} /></section></div>;
}