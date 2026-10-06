import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  periodId: z.uuid(),
  kind: z.enum(['classes', 'groups', 'students']),
  classId: z.uuid().optional(),
  q: z.string().max(120).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
const noCache = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.role !== 'teacher') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers: noCache });
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Filtro inválido.' }, { status: 400, headers: noCache });
  const { periodId, kind, classId, page, q } = parsed.data;
  const client = await createClient();
  const period = await client.from('periods').select('school_year_id').eq('id', periodId).eq('active', true).maybeSingle();
  if (period.error || !period.data) return NextResponse.json({ error: 'Período indisponível.' }, { status: 400, headers: noCache });
  if (kind !== 'classes') {
    if (!classId) return NextResponse.json({ error: 'Selecione uma turma.' }, { status: 400, headers: noCache });
    const schoolClass = await client.from('classes').select('id').eq('id', classId).eq('active', true).eq('school_year_id', period.data.school_year_id).maybeSingle();
    if (schoolClass.error || !schoolClass.data) return NextResponse.json({ error: 'Turma indisponível.' }, { status: 403, headers: noCache });
  }
  const search = q.replace(/[%_]/g, '');
  const start = (page - 1) * 20;
  if (kind === 'students') {
    let query = client.from('student_enrollments').select('students!inner(id,name)', { count: 'exact' })
      .eq('class_id', classId!).eq('active', true).eq('students.active', true).order('student_id');
    if (search) query = query.ilike('students.name', `%${search}%`);
    const { data, error, count } = await query.range(start, start + 19);
    if (error) return NextResponse.json({ error: 'Não foi possível carregar os alunos.' }, { status: 500, headers: noCache });
    return NextResponse.json({ items: (data ?? []).map((row) => row.students), count: count ?? 0 }, { headers: noCache });
  }
  let query = client.from(kind).select('id,name', { count: 'exact' }).eq('active', true).order('name').order('id');
  query = kind === 'classes' ? query.eq('school_year_id', period.data.school_year_id) : query.eq('class_id', classId!);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query.range(start, start + 19);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os destinatários.' }, { status: 500, headers: noCache });
  return NextResponse.json({ items: data ?? [], count: count ?? 0 }, { headers: noCache });
}