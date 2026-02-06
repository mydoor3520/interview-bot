import type { InterviewSession, Question, Evaluation } from '@prisma/client';

type SessionWithDetails = InterviewSession & {
  questions: (Question & { evaluation: Evaluation | null })[];
};

export function calculateAverage(sessions: SessionWithDetails[]): number {
  if (sessions.length === 0) return 0;
  const scores = sessions
    .flatMap(s => s.questions)
    .map(q => q.evaluation?.score ?? 0)
    .filter(score => score > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function analyzeByTopic(sessions: SessionWithDetails[]) {
  const topicScores: Record<string, { total: number; count: number }> = {};

  for (const session of sessions) {
    for (const topic of session.topics) {
      if (!topicScores[topic]) {
        topicScores[topic] = { total: 0, count: 0 };
      }
      for (const q of session.questions) {
        if (q.evaluation?.score) {
          topicScores[topic].total += q.evaluation.score;
          topicScores[topic].count += 1;
        }
      }
    }
  }

  return Object.entries(topicScores).map(([topic, { total, count }]) => ({
    topic,
    averageScore: count > 0 ? total / count : 0,
    questionCount: count,
  }));
}

export function analyzeProgress(sessions: SessionWithDetails[]) {
  return sessions
    .filter(s => s.completedAt)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
    .map(session => {
      const scores = session.questions
        .map(q => q.evaluation?.score ?? 0)
        .filter(s => s > 0);
      const avgScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;
      return {
        date: session.completedAt!.toISOString().split('T')[0],
        score: Math.round(avgScore * 10) / 10,
        sessionId: session.id,
      };
    });
}

export function identifyWeakAreas(sessions: SessionWithDetails[]) {
  return analyzeByTopic(sessions)
    .filter(t => t.questionCount >= 3)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 5)
    .map(t => ({ topic: t.topic, score: Math.round(t.averageScore * 10) / 10, questions: t.questionCount }));
}

export function identifyStrengths(sessions: SessionWithDetails[]) {
  return analyzeByTopic(sessions)
    .filter(t => t.questionCount >= 3)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map(t => ({ topic: t.topic, score: Math.round(t.averageScore * 10) / 10, questions: t.questionCount }));
}

export function generateRadarData(sessions: SessionWithDetails[]) {
  const topicData = analyzeByTopic(sessions);
  // Use all topics that have data, up to 8
  return topicData
    .sort((a, b) => b.questionCount - a.questionCount)
    .slice(0, 8)
    .map(t => ({
      subject: t.topic,
      score: Math.round(t.averageScore * 10) / 10,
      fullMark: 10,
    }));
}

export function generateRecommendations(sessions: SessionWithDetails[]) {
  return identifyWeakAreas(sessions).map(area => ({
    topic: area.topic,
    reason: `평균 점수 ${area.score.toFixed(1)}점으로 개선이 필요합니다.`,
    action: `${area.topic} 관련 질문을 더 연습하세요.`,
  }));
}
