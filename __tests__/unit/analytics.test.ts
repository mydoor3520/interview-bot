import { describe, it, expect } from 'vitest';
import {
  calculateAverage,
  analyzeByTopic,
  analyzeProgress,
  identifyWeakAreas,
  identifyStrengths,
  generateRadarData,
  generateRecommendations,
} from '@/lib/analytics';

// Helper to create mock session data
function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    userId: 'user-1',
    targetPositionId: null,
    topics: ['JavaScript', 'React'],
    difficulty: 'mid',
    evaluationMode: 'after_complete',
    status: 'completed',
    questionCount: 2,
    endReason: 'user_ended',
    totalScore: null,
    summary: null,
    startedAt: new Date('2026-01-01'),
    completedAt: new Date('2026-01-01T01:00:00'),
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    questions: [],
    ...overrides,
  } as any;
}

function createMockQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q-1',
    sessionId: 'session-1',
    orderIndex: 0,
    content: 'What is closure?',
    category: 'JavaScript',
    difficulty: 'mid',
    status: 'answered',
    userAnswer: 'A closure is...',
    answeredAt: new Date(),
    createdAt: new Date(),
    evaluation: null,
    ...overrides,
  } as any;
}

function createMockEvaluation(score: number) {
  return {
    id: 'eval-1',
    questionId: 'q-1',
    score,
    feedback: 'Good answer',
    modelAnswer: 'A closure is a function that...',
    strengths: ['clear'],
    weaknesses: [],
    evaluatedAt: new Date(),
    createdAt: new Date(),
  } as any;
}

describe('calculateAverage', () => {
  it('returns 0 for empty sessions', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('returns 0 for sessions with no evaluations', () => {
    const sessions = [createMockSession({ questions: [createMockQuestion()] })];
    expect(calculateAverage(sessions)).toBe(0);
  });

  it('calculates correct average from evaluations', () => {
    const sessions = [
      createMockSession({
        questions: [
          createMockQuestion({ evaluation: createMockEvaluation(8) }),
          createMockQuestion({ id: 'q-2', evaluation: createMockEvaluation(6) }),
        ],
      }),
    ];
    expect(calculateAverage(sessions)).toBe(7);
  });

  it('ignores zero scores', () => {
    const sessions = [
      createMockSession({
        questions: [
          createMockQuestion({ evaluation: createMockEvaluation(8) }),
          createMockQuestion({ id: 'q-2', evaluation: createMockEvaluation(0) }),
        ],
      }),
    ];
    expect(calculateAverage(sessions)).toBe(8);
  });
});

describe('analyzeByTopic', () => {
  it('returns empty array for no sessions', () => {
    expect(analyzeByTopic([])).toEqual([]);
  });

  it('groups scores by session topics', () => {
    const sessions = [
      createMockSession({
        topics: ['JavaScript'],
        questions: [
          createMockQuestion({ evaluation: createMockEvaluation(8) }),
          createMockQuestion({ id: 'q-2', evaluation: createMockEvaluation(6) }),
        ],
      }),
    ];
    const result = analyzeByTopic(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe('JavaScript');
    expect(result[0].averageScore).toBe(7);
    expect(result[0].questionCount).toBe(2);
  });
});

describe('analyzeProgress', () => {
  it('returns empty array for no sessions', () => {
    expect(analyzeProgress([])).toEqual([]);
  });

  it('returns chronological scores', () => {
    const sessions = [
      createMockSession({
        id: 's1',
        completedAt: new Date('2026-01-02'),
        questions: [createMockQuestion({ evaluation: createMockEvaluation(8) })],
      }),
      createMockSession({
        id: 's2',
        completedAt: new Date('2026-01-01'),
        questions: [createMockQuestion({ evaluation: createMockEvaluation(6) })],
      }),
    ];
    const result = analyzeProgress(sessions);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-01');
    expect(result[0].score).toBe(6);
    expect(result[1].date).toBe('2026-01-02');
    expect(result[1].score).toBe(8);
  });

  it('skips sessions without completedAt', () => {
    const sessions = [
      createMockSession({ completedAt: null }),
    ];
    expect(analyzeProgress(sessions)).toEqual([]);
  });
});

describe('identifyWeakAreas', () => {
  it('returns empty for no data', () => {
    expect(identifyWeakAreas([])).toEqual([]);
  });

  it('requires minimum 3 questions per topic', () => {
    const sessions = [
      createMockSession({
        topics: ['JavaScript'],
        questions: [
          createMockQuestion({ evaluation: createMockEvaluation(3) }),
          createMockQuestion({ id: 'q-2', evaluation: createMockEvaluation(4) }),
        ],
      }),
    ];
    expect(identifyWeakAreas(sessions)).toEqual([]);
  });
});

describe('identifyStrengths', () => {
  it('returns empty for no data', () => {
    expect(identifyStrengths([])).toEqual([]);
  });
});

describe('generateRadarData', () => {
  it('returns empty for no data', () => {
    expect(generateRadarData([])).toEqual([]);
  });
});

describe('generateRecommendations', () => {
  it('returns empty for no data', () => {
    expect(generateRecommendations([])).toEqual([]);
  });
});
