'use client';

import { useEffect, useState } from 'react';

interface FeatureGateData {
  tier: 'FREE' | 'PRO';
  limits: {
    monthlySessions: number | null;
    questionsPerSession: number;
    customCourse: boolean;
    advancedAnalytics: boolean;
    /** @deprecated maxTargetPositions 사용 */
    targetPositionInterview: boolean;
    maxTargetPositions: number;
    aiJobParsing: boolean;
    monthlyJobParses: number | null;
    generateQuestions: boolean;
    techKnowledge: readonly string[] | 'all';
    companyStyles: readonly string[] | 'all';
    adaptiveDifficulty: boolean;
    crossTechQuestions: boolean;
    monthlyResumeEdits: number | null;
    monthlyPortfolioGuides: number | null;
    maxPortfolioProjects: number | null;
  };
  usage: {
    sessionsThisMonth: number | null;
    remainingSessions: number | null;
    monthlyQuestions: number;
    monthlyCostUsd: number;
    currentPositionCount: number;
    remainingResumeEdits: number | null;
    remainingPortfolioGuides: number | null;
  };
}

export function useFeatureGate() {
  const [data, setData] = useState<FeatureGateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => {
        if (!res.ok) throw new Error(`Usage fetch failed (${res.status})`);
        return res.json();
      })
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /**
   * Check if user can use a specific tech knowledge base
   */
  const canUseTechKnowledge = (techId: string): boolean => {
    if (!data) return false;
    const allowed = data.limits.techKnowledge;
    return allowed === 'all' || allowed.includes(techId);
  };

  /**
   * Check if user can use a specific company style
   */
  const canUseCompanyStyle = (styleId: string): boolean => {
    if (!data) return false;
    const allowed = data.limits.companyStyles;
    return allowed === 'all' || allowed.includes(styleId);
  };

  /**
   * Check if user can use adaptive difficulty
   */
  const canUseAdaptiveDifficulty = (): boolean => {
    return data?.limits.adaptiveDifficulty ?? false;
  };

  return {
    data,
    loading,
    canUseTechKnowledge,
    canUseCompanyStyle,
    canUseAdaptiveDifficulty,
  };
}
