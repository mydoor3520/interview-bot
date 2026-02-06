import { describe, it, expect } from 'vitest';
import {
  buildProfileContext,
  buildInterviewSystemPrompt,
  buildEvaluationPrompt,
  buildSessionSummaryPrompt,
} from '@/lib/ai/prompts';
import type { ProfileContext } from '@/lib/ai/types';

const mockProfile: ProfileContext = {
  name: '홍길동',
  totalYearsExp: 5,
  currentRole: '백엔드 개발자',
  currentCompany: '테크스타트업',
  skills: [
    { name: 'Java', category: 'language', proficiency: 4, yearsUsed: 3 },
    { name: 'Spring Boot', category: 'framework', proficiency: 3 },
  ],
  experiences: [
    {
      company: '테크스타트업',
      role: '백엔드 개발자',
      startDate: '2021-01',
      description: 'API 설계 및 개발',
      techStack: ['Java', 'Spring Boot'],
      achievements: ['API 응답시간 50% 개선'],
    },
  ],
  selfIntroduction: '안녕하세요, 백엔드 개발자 홍길동입니다.',
  strengths: ['문제 해결 능력', '팀워크'],
  weaknesses: ['프론트엔드 경험 부족'],
  targetPosition: {
    company: '네이버',
    position: '시니어 백엔드 개발자',
    jobDescription: 'Spring 기반 대규모 서비스 개발',
    requirements: ['Java 5년 이상', '대규모 트래픽 경험'],
  },
};

describe('buildProfileContext', () => {
  it('includes name and role', () => {
    const result = buildProfileContext(mockProfile);
    expect(result).toContain('홍길동');
    expect(result).toContain('백엔드 개발자');
  });

  it('includes skills with proficiency', () => {
    const result = buildProfileContext(mockProfile);
    expect(result).toContain('Java');
    expect(result).toContain('숙련');  // proficiency 4
    expect(result).toContain('Spring Boot');
  });

  it('includes experience details', () => {
    const result = buildProfileContext(mockProfile);
    expect(result).toContain('테크스타트업');
    expect(result).toContain('API 설계 및 개발');
    expect(result).toContain('API 응답시간 50% 개선');
  });

  it('includes target position', () => {
    const result = buildProfileContext(mockProfile);
    expect(result).toContain('네이버');
    expect(result).toContain('시니어 백엔드 개발자');
  });

  it('includes strengths and weaknesses', () => {
    const result = buildProfileContext(mockProfile);
    expect(result).toContain('문제 해결 능력');
    expect(result).toContain('프론트엔드 경험 부족');
  });

  it('handles missing optional fields', () => {
    const minProfile: ProfileContext = {
      name: '테스트',
      totalYearsExp: 1,
      currentRole: '개발자',
      skills: [],
      experiences: [],
      strengths: [],
      weaknesses: [],
    };
    const result = buildProfileContext(minProfile);
    expect(result).toContain('테스트');
    expect(result).not.toContain('undefined');
  });
});

describe('buildInterviewSystemPrompt', () => {
  it('includes all topics', () => {
    const result = buildInterviewSystemPrompt(mockProfile, ['Java', 'Spring'], 'mid', 'immediate');
    expect(result).toContain('Java, Spring');
  });

  it('includes difficulty description for junior', () => {
    const result = buildInterviewSystemPrompt(mockProfile, ['Java'], 'junior', 'immediate');
    expect(result).toContain('주니어 레벨');
  });

  it('includes difficulty description for senior', () => {
    const result = buildInterviewSystemPrompt(mockProfile, ['Java'], 'senior', 'immediate');
    expect(result).toContain('시니어 레벨');
  });

  it('includes immediate evaluation instructions', () => {
    const result = buildInterviewSystemPrompt(mockProfile, ['Java'], 'mid', 'immediate');
    expect(result).toContain('피드백');
  });

  it('excludes evaluation instructions for after_complete mode', () => {
    const result = buildInterviewSystemPrompt(mockProfile, ['Java'], 'mid', 'after_complete');
    expect(result).toContain('평가는 하지 말고');
  });

  it('instructs natural language only (no JSON)', () => {
    const result = buildInterviewSystemPrompt(mockProfile, ['Java'], 'mid', 'immediate');
    expect(result).toContain('JSON');
    expect(result).toContain('절대 포함하지 마세요');
  });
});

describe('buildEvaluationPrompt', () => {
  it('returns system and user messages', () => {
    const result = buildEvaluationPrompt('질문', '답변', 'Java', 'mid');
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes question and answer in user message', () => {
    const result = buildEvaluationPrompt('Java GC란?', '가비지 컬렉션입니다', 'Java', 'mid');
    expect(result[1].content).toContain('Java GC란?');
    expect(result[1].content).toContain('가비지 컬렉션입니다');
  });

  it('includes JSON format instruction in system message', () => {
    const result = buildEvaluationPrompt('질문', '답변', 'Java', 'mid');
    expect(result[0].content).toContain('json');
    expect(result[0].content).toContain('score');
  });
});

describe('buildSessionSummaryPrompt', () => {
  it('returns system and user messages', () => {
    const result = buildSessionSummaryPrompt([
      { question: 'Q1', answer: 'A1', score: 8, category: 'Java' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
  });

  it('includes all questions in user message', () => {
    const result = buildSessionSummaryPrompt([
      { question: 'Java GC란?', answer: '가비지 컬렉션', score: 8, category: 'Java' },
      { question: 'React란?', answer: 'UI 라이브러리', score: 7, category: 'React' },
    ]);
    expect(result[1].content).toContain('Java GC란?');
    expect(result[1].content).toContain('React란?');
  });
});
