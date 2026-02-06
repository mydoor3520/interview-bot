import { ProfileContext, AIMessage } from './types';

/**
 * Sanitize user input for inclusion in AI prompts.
 * Strips potential prompt injection patterns.
 */
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/```/g, '')
    .replace(/\{[\s\S]*?\}/g, (match) => {
      // Allow short inline content but strip JSON-like blocks
      return match.length > 100 ? '[내용 생략]' : match;
    })
    .slice(0, 5000); // Max length per field
}

const PROFICIENCY_LABELS: Record<number, string> = {
  1: '입문',
  2: '초급',
  3: '중급',
  4: '숙련',
  5: '전문가',
};

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  junior: '주니어 레벨 (1-3년차). 기본 개념, 문법, 기초 설계에 대한 질문을 하세요.',
  mid: '미들 레벨 (4-7년차). 심화 개념, 설계 패턴, 성능 최적화에 대한 질문을 하세요.',
  senior: '시니어 레벨 (8년차 이상). 아키텍처 설계, 대규모 시스템, 기술 리더십에 대한 질문을 하세요.',
};

export function buildProfileContext(profile: ProfileContext): string {
  const lines: string[] = [];

  lines.push(`## 지원자 정보`);
  lines.push(`- 이름: ${sanitizeForPrompt(profile.name)}`);
  lines.push(`- 총 경력: ${profile.totalYearsExp}년`);
  lines.push(`- 현재 직무: ${sanitizeForPrompt(profile.currentRole)}`);
  if (profile.currentCompany) {
    lines.push(`- 현재 회사: ${sanitizeForPrompt(profile.currentCompany)}`);
  }

  if (profile.skills.length > 0) {
    lines.push(`\n## 기술 스택`);
    const grouped: Record<string, typeof profile.skills> = {};
    for (const skill of profile.skills) {
      if (!grouped[skill.category]) grouped[skill.category] = [];
      grouped[skill.category].push(skill);
    }
    for (const [category, skills] of Object.entries(grouped)) {
      const skillStr = skills
        .map(s => `${s.name}(${PROFICIENCY_LABELS[s.proficiency]}${s.yearsUsed ? `, ${s.yearsUsed}년` : ''})`)
        .join(', ');
      lines.push(`- ${category}: ${skillStr}`);
    }
  }

  if (profile.experiences.length > 0) {
    lines.push(`\n## 경력 사항`);
    for (const exp of profile.experiences) {
      const period = exp.endDate
        ? `${exp.startDate} ~ ${exp.endDate}`
        : `${exp.startDate} ~ 현재`;
      lines.push(`- ${sanitizeForPrompt(exp.company)} | ${sanitizeForPrompt(exp.role)} (${period})`);
      if (exp.description) lines.push(`  업무: ${sanitizeForPrompt(exp.description)}`);
      if (exp.techStack.length > 0) lines.push(`  기술: ${exp.techStack.join(', ')}`);
      if (exp.achievements.length > 0) {
        for (const ach of exp.achievements) {
          lines.push(`  성과: ${sanitizeForPrompt(ach)}`);
        }
      }
    }
  }

  if (profile.selfIntroduction) {
    lines.push(`\n## 자기소개`);
    lines.push(sanitizeForPrompt(profile.selfIntroduction));
  }

  if (profile.strengths.length > 0) {
    lines.push(`\n## 본인이 말하는 강점`);
    lines.push(profile.strengths.join(', '));
  }

  if (profile.weaknesses.length > 0) {
    lines.push(`\n## 본인이 말하는 약점`);
    lines.push(profile.weaknesses.join(', '));
  }

  if (profile.targetPosition) {
    lines.push(`\n## 지원 포지션`);
    lines.push(`- 회사: ${sanitizeForPrompt(profile.targetPosition.company)}`);
    lines.push(`- 포지션: ${sanitizeForPrompt(profile.targetPosition.position)}`);
    if (profile.targetPosition.jobDescription) {
      lines.push(`- JD:\n${sanitizeForPrompt(profile.targetPosition.jobDescription)}`);
    }
    if (profile.targetPosition.requirements.length > 0) {
      lines.push(`- 요구사항: ${profile.targetPosition.requirements.join(', ')}`);
    }
  }

  return lines.join('\n');
}

export function buildInterviewSystemPrompt(
  profile: ProfileContext,
  topics: string[],
  difficulty: string,
  evaluationMode: 'immediate' | 'after_complete'
): string {
  const profileContext = buildProfileContext(profile);
  const difficultyDesc = DIFFICULTY_DESCRIPTIONS[difficulty] || DIFFICULTY_DESCRIPTIONS.mid;

  return `당신은 경험이 풍부한 시니어 개발자이자 기술 면접관입니다.
아래 지원자의 프로필을 참고하여, 맞춤형 기술 면접을 진행해주세요.

${profileContext}

## 면접 설정
- 주제: ${topics.join(', ')}
- 난이도: ${difficultyDesc}
- 평가 모드: ${evaluationMode === 'immediate' ? '즉시 평가 (답변마다 평가)' : '종료 후 일괄 평가'}

## 면접 진행 규칙
1. 한 번에 하나의 질문만 하세요.
2. 지원자의 경력과 기술 수준에 맞는 깊이의 질문을 하세요.
3. 답변이 불충분하면 꼬리질문으로 더 깊이 파고드세요.
4. 지원자의 경력에 기반한 경험 질문도 포함하세요.
5. 프로필의 약점 영역에 대한 검증 질문도 적절히 섞어주세요.

## 응답 규칙
- 자연어로만 대화하세요. JSON, 코드 블록, 메타데이터를 절대 포함하지 마세요.
- 면접관으로서 자연스럽게 말하듯이 질문하세요.
- 질문할 때는 질문 내용만 자연스러운 한국어로 작성하세요.
${evaluationMode === 'immediate' ? `- 답변을 받으면 간결하게 피드백한 후 자연스럽게 다음 질문으로 넘어가세요.
- 피드백은 잘한 점, 보완할 점, 핵심 포인트를 포함하되 대화체로 작성하세요.` : '- 답변에 대한 평가는 하지 말고, 다음 질문으로 자연스럽게 넘어가세요.'}

## 중요
- 자연스럽고 전문적인 면접 분위기를 유지하세요.
- 질문은 한국어로 하되, 기술 용어는 영어를 함께 사용하세요.
- 너무 쉽거나 너무 어려운 질문을 피하고, 지원자의 실력을 정확히 파악할 수 있는 질문을 하세요.
- 첫 메시지에서는 반드시 간단한 인사와 함께 첫 번째 질문을 하세요.`;
}

export function buildEvaluationPrompt(
  question: string,
  userAnswer: string,
  category: string,
  difficulty: string
): AIMessage[] {
  return [
    {
      role: 'system',
      content: `당신은 기술 면접 평가 전문가입니다. 아래 질문에 대한 답변을 평가해주세요.

평가 기준 (각 항목 1-10점):
1. 정확성: 기술적으로 올바른가?
2. 깊이: 개념을 깊이 있게 이해하고 있는가?
3. 구조: 답변이 체계적으로 구성되어 있는가?
4. 실무성: 실무 경험이 반영되어 있는가?
5. 완결성: 질문에 대해 충분히 답변했는가?

종합 점수는 위 5개 항목의 가중 평균으로 산출하세요.

반드시 다음 JSON 포맷으로만 응답하세요:
\`\`\`json
{
  "score": 종합점수(1-10),
  "feedback": "상세한 피드백 텍스트",
  "modelAnswer": "이 질문에 대한 모범 답안",
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"]
}
\`\`\``,
    },
    {
      role: 'user',
      content: `카테고리: ${sanitizeForPrompt(category)}\n난이도: ${difficulty}\n\n질문: ${sanitizeForPrompt(question)}\n\n지원자 답변:\n${sanitizeForPrompt(userAnswer)}`,
    },
  ];
}

export function buildSessionSummaryPrompt(
  questions: Array<{ question: string; answer: string; score?: number; category: string }>
): AIMessage[] {
  const questionsText = questions
    .map((q, i) => `Q${i + 1} [${sanitizeForPrompt(q.category)}]: ${sanitizeForPrompt(q.question)}\nA: ${sanitizeForPrompt(q.answer)}\n점수: ${q.score ?? '미평가'}`)
    .join('\n\n');

  return [
    {
      role: 'system',
      content: `당신은 면접 세션 요약 전문가입니다. 아래 면접 세션의 전체 질문과 답변을 분석하여 세션 요약을 작성해주세요.

반드시 다음 JSON 포맷으로 응답하세요:
\`\`\`json
{
  "totalScore": 종합점수(1-10),
  "summary": "전체 세션 요약 (3-5문장)",
  "topicScores": {"주제1": 점수, "주제2": 점수},
  "overallStrengths": ["강점1", "강점2"],
  "overallWeaknesses": ["약점1", "약점2"],
  "recommendations": ["추천1", "추천2"]
}
\`\`\``,
    },
    {
      role: 'user',
      content: `면접 세션 결과:\n\n${questionsText}`,
    },
  ];
}
