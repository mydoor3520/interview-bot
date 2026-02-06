'use client';

import { useEffect, useState } from 'react';

interface FeatureGateData {
  tier: 'FREE' | 'PRO';
  limits: {
    monthlySessions: number | null;
    questionsPerSession: number;
    customCourse: boolean;
    advancedAnalytics: boolean;
  };
  usage: {
    sessionsThisMonth: number | null;
    remainingSessions: number | null;
    monthlyQuestions: number;
    monthlyCostUsd: number;
  };
}

export function useFeatureGate() {
  const [data, setData] = useState<FeatureGateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
