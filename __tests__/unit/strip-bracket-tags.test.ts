import { describe, it, expect } from 'vitest';
import { stripBracketTags, stripMarkdown } from '@/lib/utils/strip-markdown';

describe('stripBracketTags', () => {
  it('removes JD matching tags', () => {
    expect(stripBracketTags('[JD 우대사항 매칭] 팀 리드 역량')).toBe('팀 리드 역량');
    expect(stripBracketTags('[JD 필수 자격요건 매칭] CI/CD 경험')).toBe('CI/CD 경험');
  });

  it('removes requirement tags', () => {
    expect(stripBracketTags('[필수 자격요건] 3년 이상 경력')).toBe('3년 이상 경력');
    expect(stripBracketTags('[우대사항] 대규모 트래픽 경험')).toBe('대규모 트래픽 경험');
    expect(stripBracketTags('[자격요건 매칭] 백엔드 개발')).toBe('백엔드 개발');
  });

  it('removes Korean structural headings', () => {
    expect(stripBracketTags('[인프라 관리] 클라우드 환경 구축')).toBe('클라우드 환경 구축');
    expect(stripBracketTags('[데이터 처리] 파이프라인 설계')).toBe('파이프라인 설계');
  });

  it('preserves English bracket content', () => {
    expect(stripBracketTags('[AWS] 기반 인프라')).toBe('[AWS] 기반 인프라');
    expect(stripBracketTags('[CI/CD] 파이프라인')).toBe('[CI/CD] 파이프라인');
  });

  it('preserves brackets with numbers', () => {
    expect(stripBracketTags('[2023년 기준] 매출 증가')).toBe('[2023년 기준] 매출 증가');
    expect(stripBracketTags('[팀 A] 프로젝트')).toBe('[팀 A] 프로젝트');
  });

  it('handles empty string', () => {
    expect(stripBracketTags('')).toBe('');
  });

  it('handles text with no brackets', () => {
    expect(stripBracketTags('순수 텍스트 내용')).toBe('순수 텍스트 내용');
  });

  it('cleans up multiple consecutive spaces', () => {
    expect(stripBracketTags('[JD 매칭]  [인프라 관리] 결과물')).toBe('결과물');
  });

  it('works correctly chained with stripMarkdown', () => {
    const input = '**[JD 매칭]** 역량 보유';
    const result = stripBracketTags(stripMarkdown(input));
    expect(result).toBe('역량 보유');
  });
});
