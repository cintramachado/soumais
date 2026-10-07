export const resultStatuses = ['pending', 'completed_on_time', 'completed_late', 'not_completed'] as const;
export type ResultStatus = typeof resultStatuses[number];
export type ScoreInput = { maximumScore: number; status: ResultStatus; lateMultiplier: number; manualScore?: number | null };

function validatePoints(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 99999999.99 || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) {
    throw new RangeError('Invalid points value');
  }
}

export function calculateTaskScore({ maximumScore, status, lateMultiplier, manualScore }: ScoreInput): number {
  validatePoints(maximumScore);
  if (!resultStatuses.includes(status)) throw new RangeError('Invalid result status');
  if (!Number.isFinite(lateMultiplier) || lateMultiplier < 0 || lateMultiplier > 1 || Math.abs(lateMultiplier * 10000 - Math.round(lateMultiplier * 10000)) > 0.000001) {
    throw new RangeError('Invalid late multiplier');
  }
  if (manualScore != null) {
    validatePoints(manualScore);
    if (manualScore > maximumScore) throw new RangeError('Manual score exceeds maximum');
    return manualScore;
  }
  if (status === 'completed_on_time') return maximumScore;
  if (status !== 'completed_late') return 0;
  const maximumCents = Math.round(maximumScore * 100);
  const multiplierUnits = Math.round(lateMultiplier * 10000);
  return Math.floor((maximumCents * multiplierUnits + 5000) / 10000) / 100;
}

export function calculateScoreMetrics(entries: readonly ScoreInput[]) {
  const totalCents = entries.reduce((total, entry) => total + Math.round(calculateTaskScore(entry) * 100), 0);
  const maximumCents = entries.reduce((total, entry) => total + Math.round(entry.maximumScore * 100), 0);
  if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(maximumCents)) throw new RangeError('Score total too large');
  const completed = entries.filter((entry) => entry.status === 'completed_on_time' || entry.status === 'completed_late').length;
  const onTime = entries.filter((entry) => entry.status === 'completed_on_time').length;
  const late = entries.filter((entry) => entry.status === 'completed_late').length;
  const pending = entries.filter((entry) => entry.status === 'pending').length;
  return {
    totalScore: totalCents / 100,
    maximumScore: maximumCents / 100,
    achievementPercentage: maximumCents === 0 ? 0 : Math.round(totalCents * 10000 / maximumCents) / 100,
    completed, onTime, late, pending,
    completedPercentage: entries.length === 0 ? 0 : Math.round(completed * 10000 / entries.length) / 100,
    onTimePercentage: entries.length === 0 ? 0 : Math.round(onTime * 10000 / entries.length) / 100,
  };
}