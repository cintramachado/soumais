import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { reportFilterSchema } from '@/features/reports/schemas';
import { generateReportPdf } from '@/features/reports/generate-report-pdf';

export const runtime = 'nodejs';
const noCache = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.role !== 'teacher') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers: noCache });
    const filters = reportFilterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!filters.success) return NextResponse.json({ error: 'Selecione filtros válidos.' }, { status: 400, headers: noCache });
    const client = await createClient();
    const { data, error } = await client.rpc('class_score_report', {
      p_class_id: filters.data.classId, p_period_id: filters.data.periodId || null, p_group_id: filters.data.groupId || null,
    });
    if (error) return NextResponse.json({ error: error.code === '42501' ? 'Você não tem acesso a essa turma.' : 'Não foi possível gerar. Confira os filtros; limite de 1.000 alunos por relatório.' }, { status: error.code === '42501' ? 403 : 400, headers: noCache });
    const bytes = await generateReportPdf(data, profile.full_name);
    return new Response(new Uint8Array(bytes), { headers: { ...noCache, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="soulmais-relatorio-pontos.pdf"' } });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Report generation failed', error instanceof Error ? error.name : 'Unknown');
    return NextResponse.json({ error: 'Não foi possível gerar o PDF. Tente novamente.' }, { status: 500, headers: noCache });
  }
}