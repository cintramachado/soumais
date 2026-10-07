import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { requireProfile } from "@/lib/auth/profile";
import { DashboardReport } from '@/features/reports/components/dashboard-report';

export default async function TeacherDashboardPage({ searchParams }: { searchParams: Promise<{ reportClass?: string; classPage?: string }> }) {
  const profile = await requireProfile("teacher");
  return <DashboardHome profile={profile} role="teacher"><DashboardReport filters={await searchParams} /></DashboardHome>;
}