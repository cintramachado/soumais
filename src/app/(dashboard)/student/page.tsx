import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { requireProfile } from "@/lib/auth/profile";

export default async function StudentDashboardPage() {
  const profile = await requireProfile("student");
  return <DashboardHome profile={profile} role="student" />;
}