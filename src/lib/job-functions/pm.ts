import type { JobFunctionConfig } from './types';

export const pmConfig: JobFunctionConfig = {
  id: 'pm',
  label: '기획/PM',
  description: '프로덕트 매니저/기획자를 위한 직무 면접',
  icon: 'clipboard',

  presetTopics: [
    { category: '전략/분석', topics: ['시장 분석', '경쟁 분석', '사용자 문제 정의', 'OKR/KPI 설정', 'PRD 작성'] },
    { category: '실행/운영', topics: ['우선순위 결정', '로드맵 관리', '스프린트 운영', '이해관계자 관리', '출시 전략'] },
    { category: '데이터', topics: ['제품 지표 분석', '퍼널 분석', 'A/B 테스트', '사용자 분석', 'SQL/데이터 추출'] },
    { category: '케이스 면접', topics: ['제품 설계 케이스', '지표 개선 케이스', '피벗 판단', '기능 스펙 작성', '경쟁 대응'] },
  ],

  behavioralTopics: [
    { category: '인성 기본', topics: ['자기소개', '프로젝트 경험', '협업/갈등', '리더십', '커리어 비전'] },
    { category: '인성 심화', topics: ['조직문화 적합성', '직업윤리', '스트레스 대처', '지원동기', '상황판단'] },
  ],

  skillCategories: [
    { key: 'pm-tool', label: 'PM 도구', items: ['Jira', 'Confluence', 'Notion', 'Linear', 'Asana', 'Monday', 'Productboard', 'Aha!'] },
    { key: 'analytics', label: '분석 도구', items: ['Google Analytics', 'Amplitude', 'Mixpanel', 'Looker', 'Tableau', 'SQL', 'BigQuery', 'Excel'] },
    { key: 'design', label: '디자인/프로토', items: ['Figma', 'Miro', 'Whimsical', 'draw.io', 'Balsamiq'] },
    { key: 'methodology', label: '방법론', items: ['Agile/Scrum', 'Kanban', 'Design Thinking', 'Lean Startup', 'OKR', 'Jobs-to-be-Done'] },
  ],

  interviewerPersona: '당신은 경험이 풍부한 프로덕트 디렉터이자 면접관입니다.\n아래 지원자의 프로필을 참고하여, 프로덕트 매니지먼트 역량을 평가하는 맞춤형 면접을 진행해주세요.',

  difficultyDescriptions: {
    junior: '주니어 레벨 (1-3년차). 기본적인 제품 분석, 요구사항 정의, 스펙 작성에 대해 질문하세요.',
    mid: '미들 레벨 (4-7년차). 전략 수립, 우선순위 프레임워크, 데이터 기반 의사결정에 대해 질문하세요.',
    senior: '시니어 레벨 (8년차 이상). 제품 비전, 조직 관리, 비즈니스 전략, 경영진 커뮤니케이션에 대해 질문하세요.',
  },

  questionCategories: ['전략분석', '제품경험', '케이스면접', '인성문화핏', '직무적합성'],
  categoryDistribution: '카테고리별 분포: 전략분석 4-6개, 제품경험 3-4개, 케이스면접 2-3개, 인성문화핏 3-4개, 직무적합성 2-3개',
  evaluationExpertType: '프로덕트 매니지먼트 면접 평가 전문가',
};
