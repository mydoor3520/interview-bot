import { describe, it, expect } from 'vitest';
import { TIER_LIMITS, checkBooleanFeature, getNumericLimit } from '@/lib/feature-gate';

describe('TIER_LIMITS', () => {
  it('FREE tier has 15 monthly sessions', () => {
    expect(TIER_LIMITS.FREE.monthlySessions).toBe(15);
  });

  it('PRO tier has 30 monthly sessions', () => {
    expect(TIER_LIMITS.PRO.monthlySessions).toBe(30);
  });

  it('FREE tier has 7 questions per session', () => {
    expect(TIER_LIMITS.FREE.questionsPerSession).toBe(7);
  });

  it('PRO tier has 15 questions per session', () => {
    expect(TIER_LIMITS.PRO.questionsPerSession).toBe(15);
  });

  it('FREE tier has advanced analytics', () => {
    expect(TIER_LIMITS.FREE.advancedAnalytics).toBe(true);
  });

  it('PRO tier has advanced analytics', () => {
    expect(TIER_LIMITS.PRO.advancedAnalytics).toBe(true);
  });
});

describe('checkBooleanFeature', () => {
  it('returns true for FREE tier advanced analytics', () => {
    expect(checkBooleanFeature('FREE', 'advancedAnalytics')).toBe(true);
  });

  it('returns true for PRO tier advanced analytics', () => {
    expect(checkBooleanFeature('PRO', 'advancedAnalytics')).toBe(true);
  });

  it('returns false for FREE tier custom course', () => {
    expect(checkBooleanFeature('FREE', 'customCourse')).toBe(false);
  });

  it('returns true for PRO tier custom course', () => {
    expect(checkBooleanFeature('PRO', 'customCourse')).toBe(true);
  });

  it('returns true for non-boolean features (monthlySessions)', () => {
    // monthlySessions is a number, so checkBooleanFeature returns true
    expect(checkBooleanFeature('FREE', 'monthlySessions')).toBe(true);
  });
});

describe('getNumericLimit', () => {
  it('returns 15 for FREE monthly sessions', () => {
    expect(getNumericLimit('FREE', 'monthlySessions')).toBe(15);
  });

  it('returns 30 for PRO monthly sessions', () => {
    expect(getNumericLimit('PRO', 'monthlySessions')).toBe(30);
  });

  it('returns 7 for FREE questions per session', () => {
    expect(getNumericLimit('FREE', 'questionsPerSession')).toBe(7);
  });

  it('returns 15 for PRO questions per session', () => {
    expect(getNumericLimit('PRO', 'questionsPerSession')).toBe(15);
  });

  it('returns null for boolean features', () => {
    // advancedAnalytics is boolean, so getNumericLimit returns null
    expect(getNumericLimit('FREE', 'advancedAnalytics')).toBeNull();
  });
});
