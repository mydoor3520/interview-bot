import type { DifficultyLevel } from './types';

export interface DifficultyMapping {
  topicSelection: DifficultyLevel;  // Which difficulty tier of topics to use
  questionDepth: number;            // 1-3, how deep follow-ups should go
}

// Difficulty matrix mapping: [sessionDifficulty][proficiency] -> mapping
const DIFFICULTY_MATRIX: Record<DifficultyLevel, Record<number, DifficultyMapping>> = {
  junior: {
    1: { topicSelection: 'junior', questionDepth: 1 },
    2: { topicSelection: 'junior', questionDepth: 1 },
    3: { topicSelection: 'junior', questionDepth: 2 },
    4: { topicSelection: 'mid', questionDepth: 2 },
    5: { topicSelection: 'mid', questionDepth: 2 },
  },
  mid: {
    1: { topicSelection: 'junior', questionDepth: 1 },
    2: { topicSelection: 'junior', questionDepth: 2 },
    3: { topicSelection: 'mid', questionDepth: 2 },
    4: { topicSelection: 'mid', questionDepth: 3 },
    5: { topicSelection: 'senior', questionDepth: 3 },
  },
  senior: {
    1: { topicSelection: 'junior', questionDepth: 2 },
    2: { topicSelection: 'mid', questionDepth: 2 },
    3: { topicSelection: 'mid', questionDepth: 3 },
    4: { topicSelection: 'senior', questionDepth: 3 },
    5: { topicSelection: 'senior', questionDepth: 3 },
  },
};

/**
 * Map session difficulty + proficiency to difficulty mapping
 */
export function mapDifficulty(
  sessionDifficulty: DifficultyLevel,
  proficiency: number
): DifficultyMapping {
  // Clamp proficiency to 1-5 range
  const clampedProficiency = Math.max(1, Math.min(5, proficiency));

  return DIFFICULTY_MATRIX[sessionDifficulty][clampedProficiency];
}

/**
 * Build prompt hint for per-skill difficulty adjustment
 *
 * Example output:
 * ## 기술별 질문 깊이
 * - React: 전문가 수준 (5/5) → 시니어 레벨 토픽에서 질문하세요
 * - Kubernetes: 초급 수준 (2/5) → 주니어 레벨 기본 개념부터 확인하세요
 */
export function buildPerSkillDifficultyHint(
  skills: Array<{ tech: string; proficiency: number }>,
  sessionDifficulty: DifficultyLevel
): string {
  if (!skills || skills.length === 0) {
    return '';
  }

  const proficiencyLabels: Record<number, string> = {
    1: '입문 수준',
    2: '초급 수준',
    3: '중급 수준',
    4: '고급 수준',
    5: '전문가 수준',
  };

  const levelLabels: Record<DifficultyLevel, string> = {
    junior: '주니어',
    mid: '미드',
    senior: '시니어',
  };

  const hints = skills.map((skill) => {
    const mapping = mapDifficulty(sessionDifficulty, skill.proficiency);
    const profLabel = proficiencyLabels[skill.proficiency] || '수준';
    const levelLabel = levelLabels[mapping.topicSelection];

    let instruction = '';
    if (mapping.topicSelection === 'junior') {
      instruction = `${levelLabel} 레벨 기본 개념부터 확인하세요`;
    } else if (mapping.topicSelection === 'mid') {
      instruction = `${levelLabel} 레벨 실무 경험을 중심으로 질문하세요`;
    } else {
      instruction = `${levelLabel} 레벨 토픽에서 깊이 있게 질문하세요`;
    }

    return `- ${skill.tech}: ${profLabel} (${skill.proficiency}/5) → ${instruction}`;
  });

  return `## 기술별 질문 깊이\n${hints.join('\n')}`;
}
