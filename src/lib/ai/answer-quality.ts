export type AnswerQualityLevel = 'insufficient' | 'minimal' | 'adequate';

export interface AnswerQualityResult {
  level: AnswerQualityLevel;
  reason: string;
  charCount: number;
}

// Korean "I don't know" / non-answer patterns
const INSUFFICIENT_PATTERNS = [
  /^잘?\s*모르겠/,
  /^모르겠습니다/,
  /^모릅니다/,
  /^모르겠어요/,
  /^잘?\s*모르겠어요/,
  /^답변하기\s*어렵/,
  /^생각이\s*안/,
  /^떠오르지\s*않/,
  /^글쎄요?$/,
  /^없습니다\.?$/,
  /^없어요\.?$/,
  /^아니요\.?$/,
  /^네\.?$/,
  /^예\.?$/,
  /^패스\.?$/i,
  /^pass\.?$/i,
  /^skip\.?$/i,
  /^넘어가/,
  /^다음\s*(질문|문제)?/,
  /^몰라요/,
  /^잘\s*몰라/,
  /^특별히\s*없/,
  /^딱히\s*없/,
  /^생각나는\s*게\s*없/,
  /^그런\s*경험이?\s*없/,
];

// Patterns that indicate non-answer even in longer text
const CONTAINS_INSUFFICIENT_PATTERNS = [
  /잘\s*모르겠습니다/,
  /답변하기\s*(어렵|힘들)/,
  /생각이\s*나지\s*않/,
  /경험이\s*없어/,
  /해본\s*적이?\s*없/,
];

export function classifyAnswerQuality(answer: string): AnswerQualityResult {
  const trimmed = answer.trim();
  const charCount = trimmed.length;

  // Empty or whitespace-only
  if (charCount === 0) {
    return { level: 'insufficient', reason: '답변이 비어있습니다.', charCount };
  }

  // Very short answers (< 10 chars) — check patterns first
  if (charCount < 10) {
    return { level: 'insufficient', reason: '답변이 너무 짧습니다.', charCount };
  }

  // Check if the answer starts with a known "I don't know" pattern
  for (const pattern of INSUFFICIENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { level: 'insufficient', reason: '질문에 대한 구체적인 답변이 아닙니다.', charCount };
    }
  }

  // For short answers (10-50 chars), check if they contain non-answer patterns
  if (charCount <= 50) {
    for (const pattern of CONTAINS_INSUFFICIENT_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { level: 'insufficient', reason: '질문에 대한 구체적인 답변이 아닙니다.', charCount };
      }
    }
    return { level: 'minimal', reason: '답변이 간략합니다.', charCount };
  }

  // Medium-length answers (50-80 chars) — might still be very thin
  // Check for non-answer patterns embedded in slightly longer text
  if (charCount <= 80) {
    for (const pattern of CONTAINS_INSUFFICIENT_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { level: 'minimal', reason: '답변에 구체적인 내용이 부족합니다.', charCount };
      }
    }
  }

  // Adequate answers: 50+ chars without non-answer patterns
  return { level: 'adequate', reason: '', charCount };
}
