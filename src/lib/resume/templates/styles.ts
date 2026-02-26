import type { TemplateStyles } from './types';

export const FONT_STACK =
  "'Noto Sans CJK KR', 'Apple SD Gothic Neo', '맑은 고딕', 'Malgun Gothic', system-ui, -apple-system, sans-serif";

export const BASE_RESET = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  section { break-inside: avoid; page-break-inside: avoid; }
  .resume-exp-item { break-inside: avoid; page-break-inside: avoid; }
  h2 { break-after: avoid; page-break-after: avoid; }
  @media print {
    body { margin: 0; }
  }
`;

export const CLEAN_MODERN_STYLES: TemplateStyles = {
  fontFamily: FONT_STACK,
  baseFontSize: '14px',
  lineHeight: '1.6',
  primaryColor: '#1a1a1a',
  secondaryColor: '#444444',
  textColor: '#333333',
  mutedColor: '#888888',
  borderColor: '#e0e0e0',
  accentBg: '#f8f8f8',
  sectionGap: '28px',
  itemGap: '18px',
  pagePadding: '40px 48px',
  nameSize: '28px',
  roleSize: '16px',
  sectionHeadingSize: '13px',
  bodySize: '13px',
  sectionDivider: false,
  bulletStyle: '•',
  headingWeight: '600',
};

export const PROFESSIONAL_STYLES: TemplateStyles = {
  fontFamily: FONT_STACK,
  baseFontSize: '14px',
  lineHeight: '1.55',
  primaryColor: '#0d2137',
  secondaryColor: '#1e4976',
  textColor: '#222222',
  mutedColor: '#666666',
  borderColor: '#c8d8e8',
  accentBg: '#f0f5fa',
  sectionGap: '24px',
  itemGap: '16px',
  pagePadding: '36px 44px',
  nameSize: '26px',
  roleSize: '15px',
  sectionHeadingSize: '12px',
  bodySize: '12.5px',
  sectionDivider: true,
  bulletStyle: '▸',
  headingWeight: '700',
};

export const EXECUTIVE_STYLES: TemplateStyles = {
  fontFamily: FONT_STACK,
  baseFontSize: '14px',
  lineHeight: '1.5',
  primaryColor: '#0a0a0a',
  secondaryColor: '#2c2c2c',
  textColor: '#1a1a1a',
  mutedColor: '#777777',
  borderColor: '#d0d0d0',
  accentBg: '#f5f5f5',
  sectionGap: '26px',
  itemGap: '20px',
  pagePadding: '44px 52px',
  nameSize: '30px',
  roleSize: '16px',
  sectionHeadingSize: '11px',
  bodySize: '13px',
  sectionDivider: true,
  bulletStyle: '–',
  headingWeight: '800',
};
