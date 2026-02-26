import type { JobFunctionConfig } from './types';

export const marketerConfig: JobFunctionConfig = {
  id: 'marketer',
  label: '마케팅',
  description: '마케터를 위한 직무 면접',
  icon: 'megaphone',

  presetTopics: [
    { category: '디지털 마케팅', topics: ['퍼포먼스 마케팅', 'SEO/SEM', '소셜미디어 마케팅', '콘텐츠 마케팅', 'CRM/이메일 마케팅'] },
    { category: '브랜드/전략', topics: ['브랜드 전략', '시장 분석', '경쟁 분석', '포지셔닝', 'GTM 전략'] },
    { category: '데이터/분석', topics: ['마케팅 애널리틱스', 'A/B 테스트', 'ROAS/CAC 분석', '퍼널 분석', '고객 세그먼트'] },
    { category: '커뮤니케이션', topics: ['카피라이팅', 'PR/홍보', '광고 기획', '인플루언서 마케팅'] },
  ],

  behavioralTopics: [
    { category: '인성 기본', topics: ['자기소개', '프로젝트 경험', '협업/갈등', '리더십', '커리어 비전'] },
    { category: '인성 심화', topics: ['조직문화 적합성', '직업윤리', '스트레스 대처', '지원동기', '상황판단'] },
  ],

  skillCategories: [
    { key: 'channel', label: '채널', items: ['Google Ads', 'Meta Ads', 'Naver 검색광고', 'Kakao Moment', 'YouTube Ads', 'TikTok Ads', 'LinkedIn Ads', 'Apple Search Ads'] },
    { key: 'tool', label: '분석 도구', items: ['Google Analytics', 'Amplitude', 'Mixpanel', 'HubSpot', 'Braze', 'Salesforce', 'Adobe Analytics', 'Appsflyer'] },
    { key: 'skill', label: '스킬', items: ['SQL', 'Excel/Sheets', 'Figma', 'Canva', '영상 편집', 'Photoshop', 'Looker Studio', 'Tableau', 'Python'] },
    { key: 'content', label: '콘텐츠', items: ['블로그', 'SNS 콘텐츠', '이메일 마케팅', '랜딩페이지', '보도자료', '영상 콘텐츠'] },
  ],

  interviewerPersona: '당신은 경험이 풍부한 마케팅 총괄 임원 면접관입니다.\n아래 지원자의 프로필을 참고하여, 마케팅 직무 역량을 평가하는 맞춤형 면접을 진행해주세요.',

  difficultyDescriptions: {
    junior: '주니어 레벨 (1-3년차). 마케팅 기초 개념, 채널 운영 경험, 기본 지표 이해에 대해 질문하세요.',
    mid: '미들 레벨 (4-7년차). 캠페인 전략 수립, 데이터 기반 의사결정, 예산 최적화에 대해 질문하세요.',
    senior: '시니어 레벨 (8년차 이상). 마케팅 전략 총괄, 브랜드 빌딩, 조직 관리, ROI 극대화에 대해 질문하세요.',
  },

  questionCategories: ['직무전문성', '캠페인경험', '데이터분석', '인성문화핏', '직무적합성'],
  categoryDistribution: '카테고리별 분포: 직무전문성 4-6개, 캠페인경험 3-4개, 데이터분석 2-3개, 인성문화핏 3-4개, 직무적합성 2-3개',
  evaluationExpertType: '마케팅 직무 면접 평가 전문가',
};
