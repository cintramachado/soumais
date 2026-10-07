import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';
import { dashboardMetricsSchema } from '@/features/dashboard/metrics-schema';

const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.role !== 'teacher') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers });
    const classId = request.nextUrl.searchParams.get('classId');
    if (classId && !z.uuid().safeParse(classId).success) return NextResponse.json({ error: 'Turma inválida.' }, { status: 400, headers });
    const client = await createClient();
    const { data, error } = await client.rpc('teacher_dashboard_metrics', { p_class_id: classId || null });
    if (error) return NextResponse.json({ error: 'Não foi possível atualizar os indicadores.' }, { status: error.code === '42501' ? 403 : 500, headers });
    return NextResponse.json(dashboardMetricsSchema.parse(data), { headers });
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar os indicadores.' }, { status: 500, headers });
  }
}