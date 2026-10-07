import { describe, expect, it } from 'vitest';
import { calculateTaskScore, calculateScoreMetrics, type ScoreInput } from './score-calculator';

const input: ScoreInput = { maximumScore: 100, status: 'completed_on_time', lateMultiplier: 0.5 };
describe('score calculator', () => {
  it('awards 100 on time', () => expect(calculateTaskScore(input)).toBe(100));
  it('awards 50 for 100 late at 0.5', () => expect(calculateTaskScore({ ...input, status: 'completed_late' })).toBe(50));
  it('awards 100 for 200 late', () => expect(calculateTaskScore({ ...input, maximumScore: 200, status: 'completed_late' })).toBe(100));
  it('awards zero if not completed', () => expect(calculateTaskScore({ ...input, status: 'not_completed' })).toBe(0));
  it('manual score takes precedence', () => expect(calculateTaskScore({ ...input, status: 'completed_late', manualScore: 75 })).toBe(75));
  it('manual zero also takes precedence', () => expect(calculateTaskScore({ ...input, manualScore: 0 })).toBe(0));
  it('supports configurable multipliers', () => expect(calculateTaskScore({ ...input, status: 'completed_late', lateMultiplier: 0.25 })).toBe(25));
  it('rounds half up to two decimals', () => expect(calculateTaskScore({ ...input, maximumScore: 0.01, status: 'completed_late' })).toBe(0.01));
  it('rejects invalid numbers and bounds', () => {
    expect(() => calculateTaskScore({ ...input, maximumScore: NaN })).toThrow();
    expect(() => calculateTaskScore({ ...input, lateMultiplier: 1.1 })).toThrow();
    expect(() => calculateTaskScore({ ...input, manualScore: 101 })).toThrow();
  });
});
describe('score metrics', () => {
  const entries: ScoreInput[] = [input, { ...input, status: 'completed_late' }, { ...input, status: 'pending' }, { ...input, status: 'not_completed' }];
  it('sums total student points', () => expect(calculateScoreMetrics(entries).totalScore).toBe(150));
  it('calculates achievement percentage', () => expect(calculateScoreMetrics(entries).achievementPercentage).toBe(37.5));
  it('counts pending assignments separately from not completed', () => expect(calculateScoreMetrics(entries).pending).toBe(1));
  it('calculates completed and on time percentages from assigned tasks', () => {
    expect(calculateScoreMetrics(entries).completedPercentage).toBe(50);
    expect(calculateScoreMetrics(entries).onTimePercentage).toBe(25);
  });
  it('avoids division by zero for empty data', () => expect(calculateScoreMetrics([]).achievementPercentage).toBe(0));
});