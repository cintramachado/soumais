import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { requireProfile } from "@/lib/auth/profile";

export default async function TeacherDashboardPage() {
  const profile = await requireProfile("teacher");
  return <DashboardHome profile={profile} role="teacher" />;
}