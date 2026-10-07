import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { requireProfile } from "@/lib/auth/profile";
import { DashboardReport } from '@/features/reports/components/dashboard-report';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { dashboardMetricsSchema } from '@/features/dashboard/metrics-schema';
import { TeacherDashboardStats } from '@/features/dashboard/components/teacher-dashboard-stats';

export default async function TeacherDashboardPage({ searchParams }: { searchParams: Promise<{ reportClass?: string; classPage?: string }> }) {
  const profile = await requireProfile("teacher");
  const filters = await searchParams;
  const classId = z.uuid().safeParse(filters.reportClass).success ? filters.reportClass : undefined;
  const client = await createClient();
  const { data, error } = await client.rpc('teacher_dashboard_metrics', { p_class_id: classId ?? null });
  const metrics = !error ? dashboardMetricsSchema.safeParse(data) : null;
  return <DashboardHome profile={profile} role="teacher" stats={<TeacherDashboardStats key={classId ?? 'all'} classId={classId} initial={metrics?.success ? metrics.data : undefined} />}><DashboardReport filters={filters} /></DashboardHome>;
}