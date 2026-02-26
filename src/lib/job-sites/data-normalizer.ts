/**
 * Cross-site data normalizer for parsed job postings.
 * Standardizes field formats across saramin, wanted, jobkorea, etc.
 */

import type { ParsedJobPosting } from '@/lib/ai/job-parser';

// Employment type normalization
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  // Korean variants
  '정규직': '정규직',
  '계약직': '계약직',
  '인턴': '인턴',
  '인턴십': '인턴',
  '프리랜서': '프리랜서',
  '파견직': '파견직',
  '아르바이트': '아르바이트',
  '병역특례': '병역특례',
  // English variants
  'full-time': '정규직',
  'fulltime': '정규직',
  'full time': '정규직',
  'contract': '계약직',
  'contractor': '계약직',
  'intern': '인턴',
  'internship': '인턴',
  'freelance': '프리랜서',
  'freelancer': '프리랜서',
  'part-time': '파트타임',
  'parttime': '파트타임',
  'part time': '파트타임',
  'temporary': '계약직',
  'temp': '계약직',
};

// Location normalization - standardize Korean region names
const REGION_NORMALIZATION: Record<string, string> = {
  '서울특별시': '서울',
  '서울시': '서울',
  '부산광역시': '부산',
  '대구광역시': '대구',
  '인천광역시': '인천',
  '광주광역시': '광주',
  '대전광역시': '대전',
  '울산광역시': '울산',
  '세종특별자치시': '세종',
  '경기도': '경기',
  '강원도': '강원',
  '강원특별자치도': '강원',
  '충청북도': '충북',
  '충청남도': '충남',
  '전라북도': '전북',
  '전북특별자치도': '전북',
  '전라남도': '전남',
  '경상북도': '경북',
  '경상남도': '경남',
  '제주특별자치도': '제주',
  '제주도': '제주',
};

/**
 * Normalize employment type string.
 */
export function normalizeEmploymentType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();

  // Direct match
  if (EMPLOYMENT_TYPE_MAP[raw.trim()]) return EMPLOYMENT_TYPE_MAP[raw.trim()];
  if (EMPLOYMENT_TYPE_MAP[lower]) return EMPLOYMENT_TYPE_MAP[lower];

  // Partial match
  for (const [key, value] of Object.entries(EMPLOYMENT_TYPE_MAP)) {
    if (lower.includes(key.toLowerCase())) return value;
  }

  return raw.trim();
}

/**
 * Normalize location string.
 * Converts "서울특별시 강남구 역삼동" → "서울 강남구"
 */
export function normalizeLocation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let location = raw.trim();

  // Replace formal region names with short forms
  for (const [formal, short] of Object.entries(REGION_NORMALIZATION)) {
    location = location.replace(formal, short);
  }

  // Remove overly specific info (동 level)
  // Keep: 서울 강남구, Remove: 역삼동 123-45
  location = location.replace(/\s+\S+[동리읍면]\s*(\d+-?\d*)?$/g, '');

  // Clean up whitespace
  location = location.replace(/\s+/g, ' ').trim();

  return location || null;
}

/**
 * Normalize salary range string.
 * Standardizes to "N,NNN~N,NNN만원" or "협의" format.
 */
export function normalizeSalaryRange(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already in standard format
  if (/^\d{1,2},?\d{3}~\d{1,2},?\d{3}만원$/.test(trimmed)) return trimmed;

  // "협의", "면접 후 결정" etc.
  const negotiableKeywords = ['협의', '면접 후 결정', '회사 내규', '추후 협의', '경력에 따라', 'negotiable'];
  if (negotiableKeywords.some(k => trimmed.toLowerCase().includes(k.toLowerCase()))) {
    return '협의';
  }

  // Try to extract numbers and normalize
  // Patterns: "5000만원~7000만원", "5,000-7,000만원", "연 5000~7000", "5000~7000"
  const rangeMatch = trimmed.match(/(\d{1,2},?\d{3})\s*[~\-–—]\s*(\d{1,2},?\d{3})/);
  if (rangeMatch) {
    const low = formatSalaryNumber(rangeMatch[1]);
    const high = formatSalaryNumber(rangeMatch[2]);
    return `${low}~${high}만원`;
  }

  // Single number: "5000만원 이상"
  const singleMatch = trimmed.match(/(\d{1,2},?\d{3})\s*만원?\s*(이상|부터|~)?/);
  if (singleMatch) {
    const num = formatSalaryNumber(singleMatch[1]);
    return `${num}만원 이상`;
  }

  return trimmed;
}

function formatSalaryNumber(raw: string): string {
  const num = parseInt(raw.replace(/,/g, ''), 10);
  return num.toLocaleString('ko-KR');
}

/**
 * Normalize deadline string.
 * Standardizes to ISO date "YYYY-MM-DD" or "상시채용".
 */
export function normalizeDeadline(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // "상시채용", "수시", "채용 시 마감" etc.
  const ongoingKeywords = ['상시', '수시', '채용시', '채용 시', '마감 시', 'ongoing', 'open'];
  if (ongoingKeywords.some(k => trimmed.toLowerCase().includes(k.toLowerCase()))) {
    return '상시채용';
  }

  // Try to parse date formats
  // YYYY-MM-DD (already standard)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // YYYY.MM.DD or YYYY/MM/DD
  const dotMatch = trimmed.match(/(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotMatch) {
    return `${dotMatch[1]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[3].padStart(2, '0')}`;
  }

  // ~MM/DD or ~MM.DD (current year assumed)
  const shortMatch = trimmed.match(/~?\s*(\d{1,2})[./](\d{1,2})/);
  if (shortMatch) {
    const year = new Date().getFullYear();
    return `${year}-${shortMatch[1].padStart(2, '0')}-${shortMatch[2].padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Normalize company size string.
 */
export function normalizeCompanySize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Extract employee count if present
  const countMatch = trimmed.match(/(\d+)\s*[~\-–]\s*(\d+)\s*명?/);
  if (countMatch) {
    const low = parseInt(countMatch[1], 10);
    const high = parseInt(countMatch[2], 10);
    if (high <= 10) return `스타트업 (${low}-${high}명)`;
    if (high <= 50) return `스타트업 (${low}-${high}명)`;
    if (high <= 200) return `중소기업 (${low}-${high}명)`;
    if (high <= 1000) return `중견기업 (${low}-${high}명)`;
    return `대기업 (${low}-${high}명)`;
  }

  const singleCountMatch = trimmed.match(/(\d+)\s*명?\s*(이상|이하)?/);
  if (singleCountMatch) {
    const count = parseInt(singleCountMatch[1], 10);
    const suffix = singleCountMatch[2] || '';
    if (count <= 50) return `스타트업 (${count}명${suffix})`;
    if (count <= 200) return `중소기업 (${count}명${suffix})`;
    if (count <= 1000) return `중견기업 (${count}명${suffix})`;
    return `대기업 (${count}명${suffix})`;
  }

  // Keywords
  const sizeKeywords: Record<string, string> = {
    '스타트업': '스타트업',
    '중소기업': '중소기업',
    '중견기업': '중견기업',
    '대기업': '대기업',
    '대형': '대기업',
    '유니콘': '유니콘',
  };

  for (const [key, value] of Object.entries(sizeKeywords)) {
    if (trimmed.includes(key)) return value;
  }

  return trimmed;
}

/**
 * Normalize all fields of a parsed job posting.
 */
export function normalizeJobPosting(posting: ParsedJobPosting): ParsedJobPosting {
  return {
    ...posting,
    employmentType: normalizeEmploymentType(posting.employmentType),
    location: normalizeLocation(posting.location),
    salaryRange: normalizeSalaryRange(posting.salaryRange),
    deadline: normalizeDeadline(posting.deadline),
    companySize: normalizeCompanySize(posting.companySize),
    // techStack normalization is handled separately by tech-normalizer.ts
  };
}
