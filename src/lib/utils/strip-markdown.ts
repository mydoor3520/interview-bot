/**
 * AI 응답에서 마크다운 문법을 제거하고 순수 텍스트만 남기는 유틸리티
 */
export function stripMarkdown(text: string): string {
  return text
    // 코드 블록: fence 제거, 내용 보존
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    // 인라인 코드: 백틱 제거
    .replace(/`([^`]+)`/g, '$1')
    // 헤딩: # 제거
    .replace(/^#{1,6}\s+/gm, '')
    // 볼드/이탤릭: ** * __ 제거 (볼드 먼저 처리)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // 취소선: ~~ 제거
    .replace(/~~([^~]+)~~/g, '$1')
    // 링크: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 블록쿼트: > 제거
    .replace(/^>\s?/gm, '')
    // 리스트 마커: - * + 제거 (줄 시작, 볼드/이탤릭 처리 후이므로 안전)
    .replace(/^[\-\*\+]\s+/gm, '')
    // 숫자 리스트 마커: 1. 2. 등 제거
    .replace(/^\d+\.\s+/gm, '')
    // 수평선 제거
    .replace(/^---+$/gm, '')
    // 연속 빈 줄 정리
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * AI 응답에서 [대괄호 태그] 패턴을 제거
 * - [JD 우대사항 매칭], [필수 자격요건], [자격요건 매칭] 등 JD 관련 태그
 * - [인프라 관리], [데이터 처리] 등 AI가 삽입하는 구조화 제목
 *
 * 주의: stripMarkdown() 이후 호출할 것 (markdown 링크 [text](url)은 이미 제거됨)
 */
export function stripBracketTags(text: string): string {
  return text
    .replace(/\[(?:JD|필수|우대|자격)[^\]]*\]/g, '')
    .replace(/\[[\uAC00-\uD7AF\s]{2,10}\]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
