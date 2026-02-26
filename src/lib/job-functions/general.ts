import type { JobFunctionConfig } from './types';

export const generalConfig: JobFunctionConfig = {
  id: 'general',
  label: '일반',
  description: '직군 공통 면접 (인성/역량 중심)',
  icon: 'briefcase',

  presetTopics: [
    { category: '인성/역량', topics: ['자기소개', '지원동기', '협업/갈등 해결', '리더십', '커리어 비전'] },
    { category: '직무역량', topics: ['문제 해결 사례', '성과 달성 경험', '의사결정 과정', '위기 관리', '시간 관리'] },
    { category: '조직적합성', topics: ['조직문화', '팀워크', '피드백 수용', '변화 적응', '자기개발'] },
  ],

  behavioralTopics: [
    { category: '인성 기본', topics: ['자기소개', '프로젝트 경험', '협업/갈등', '리더십', '커리어 비전'] },
    { category: '인성 심화', topics: ['조직문화 적합성', '직업윤리', '스트레스 대처', '지원동기', '상황판단'] },
  ],

  skillCategories: [
    { key: 'office', label: '오피스', items: ['MS Office', 'Google Workspace', 'Notion', 'Slack', 'Zoom', 'Teams'] },
    { key: 'data', label: '데이터', items: ['Excel/Sheets', 'SQL', 'Google Analytics', 'Tableau', 'PowerBI'] },
    { key: 'communication', label: '커뮤니케이션', items: ['프레젠테이션', '보고서 작성', '이메일 커뮤니케이션', '회의 진행'] },
    { key: 'methodology', label: '업무 방법론', items: ['프로젝트 관리', 'Agile', '식스시그마', 'OKR', 'KPI 관리'] },
  ],

  interviewerPersona: '당신은 경험이 풍부한 인사 면접관이자 임원 면접관입니다.\n아래 지원자의 프로필을 참고하여, 직무 역량과 조직 적합성을 평가하는 맞춤형 면접을 진행해주세요.',

  difficultyDescriptions: {
    junior: '주니어 레벨 (1-3년차). 기본 역량, 학습 능력, 성장 가능성에 대해 질문하세요.',
    mid: '미들 레벨 (4-7년차). 전문성, 문제 해결 능력, 팀 기여도에 대해 질문하세요.',
    senior: '시니어 레벨 (8년차 이상). 리더십, 전략적 사고, 조직 영향력에 대해 질문하세요.',
  },

  questionCategories: ['역량평가', '경험사례', '상황대처', '인성문화핏', '직무적합성'],
  categoryDistribution: '카테고리별 분포: 역량평가 4-6개, 경험사례 3-4개, 상황대처 2-3개, 인성문화핏 3-4개, 직무적합성 2-3개',
  evaluationExpertType: '인사 면접 평가 전문가',
};
