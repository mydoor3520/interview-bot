export const TEMPLATE_META = {
  'clean-modern': {
    name: '클린 모던',
    description: '미니멀하고 넓은 여백의 현대적 디자인',
    bestFor: '스타트업, IT 기업',
  },
  'professional': {
    name: '프로페셔널',
    description: '구조적이고 전통적인 배치의 전문가 디자인',
    bestFor: '대기업, 금융, 컨설팅',
  },
  'executive': {
    name: '이그제큐티브',
    description: '핵심 성과를 강조하는 임팩트 중심 디자인',
    bestFor: '시니어/CxO, 경력 10년+',
  },
} as const;

export const RATE_LIMITS = {
  generate: { FREE: 3, PRO: 20 },  // per day
  download: 30,  // per hour
} as const;

export const BUZZWORDS = [
  'results-oriented', 'strategic thinker', 'passionate',
  'dynamic', 'hardworking', 'team player', 'self-starter',
  'detail-oriented', 'go-getter', 'synergy',
  '열정적인', '성실한', '책임감 있는', '도전적인',
  '글로벌 마인드', '커뮤니케이션 능력',
] as const;

export const MAX_BULLETS_PER_ROLE = 5;
export const MAX_CORE_COMPETENCIES = 5;
export const MIN_CORE_COMPETENCIES = 3;
export const MAX_STRENGTHS = 5;
export const MAX_SUMMARY_PARAGRAPHS = 2;
