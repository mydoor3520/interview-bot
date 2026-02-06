import { describe, it, expect } from 'vitest';
import { TIER_LIMITS, checkBooleanFeature, getNumericLimit } from '@/lib/feature-gate';

describe('TIER_LIMITS', () => {
  it('FREE tier has 3 monthly sessions', () => {
    expect(TIER_LIMITS.FREE.monthlySessions).toBe(3);
  });

  it('PRO tier has unlimited monthly sessions', () => {
    expect(TIER_LIMITS.PRO.monthlySessions).toBeNull();
  });

  it('FREE tier has 10 questions per session', () => {
    expect(TIER_LIMITS.FREE.questionsPerSession).toBe(10);
  });

  it('PRO tier has 30 questions per session', () => {
    expect(TIER_LIMITS.PRO.questionsPerSession).toBe(30);
  });

  it('FREE tier does not have advanced analytics', () => {
    expect(TIER_LIMITS.FREE.advancedAnalytics).toBe(false);
  });

  it('PRO tier has advanced analytics', () => {
    expect(TIER_LIMITS.PRO.advancedAnalytics).toBe(true);
  });
});

describe('checkBooleanFeature', () => {
  it('returns false for FREE tier advanced analytics', () => {
    expect(checkBooleanFeature('FREE', 'advancedAnalytics')).toBe(false);
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
  it('returns 3 for FREE monthly sessions', () => {
    expect(getNumericLimit('FREE', 'monthlySessions')).toBe(3);
  });

  it('returns null for PRO monthly sessions (unlimited)', () => {
    expect(getNumericLimit('PRO', 'monthlySessions')).toBeNull();
  });

  it('returns 10 for FREE questions per session', () => {
    expect(getNumericLimit('FREE', 'questionsPerSession')).toBe(10);
  });

  it('returns 30 for PRO questions per session', () => {
    expect(getNumericLimit('PRO', 'questionsPerSession')).toBe(30);
  });

  it('returns null for boolean features', () => {
    // advancedAnalytics is boolean, so getNumericLimit returns null
    expect(getNumericLimit('FREE', 'advancedAnalytics')).toBeNull();
  });
});
