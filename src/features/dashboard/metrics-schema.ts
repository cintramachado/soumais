import { z } from 'zod';

export const dashboardMetricsSchema = z.object({
  students: z.number().int().nonnegative(),
  openTasks: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  achievementPercentage: z.number().finite().nonnegative(),
  completedPercentage: z.number().finite().nonnegative(),
  totalScore: z.number().finite().nonnegative(),
  updatedAt: z.string(),
});
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;