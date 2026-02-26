import type { JobFunctionConfig } from './types';

export const designerConfig: JobFunctionConfig = {
  id: 'designer',
  label: '디자인',
  description: '디자이너를 위한 직무 면접',
  icon: 'palette',

  presetTopics: [
    { category: 'UX 디자인', topics: ['사용자 리서치', '정보 구조(IA)', '와이어프레임', '프로토타이핑', '사용성 테스트'] },
    { category: 'UI 디자인', topics: ['디자인 시스템', '비주얼 디자인', '반응형 디자인', '접근성(A11y)', '모션 디자인'] },
    { category: '프로덕트 디자인', topics: ['디자인 프로세스', '디자인 씽킹', '데이터 기반 디자인', '디자인 협업', 'A/B 테스트'] },
    { category: '시각 디자인', topics: ['타이포그래피', '색채론', '레이아웃', '일러스트', '브랜드 아이덴티티'] },
  ],

  behavioralTopics: [
    { category: '인성 기본', topics: ['자기소개', '프로젝트 경험', '협업/갈등', '리더십', '커리어 비전'] },
    { category: '인성 심화', topics: ['조직문화 적합성', '직업윤리', '스트레스 대처', '지원동기', '상황판단'] },
  ],

  skillCategories: [
    { key: 'design-tool', label: '디자인 도구', items: ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects', 'Principle', 'Framer'] },
    { key: 'prototyping', label: '프로토타이핑', items: ['Figma Prototype', 'InVision', 'Principle', 'ProtoPie', 'Framer', 'Origami'] },
    { key: 'research', label: '리서치', items: ['UserTesting', 'Hotjar', 'Maze', 'Google Analytics', 'SurveyMonkey', 'Optimal Workshop'] },
    { key: 'dev-skill', label: '개발 역량', items: ['HTML/CSS', 'React', 'Swift UI', 'Android XML', 'Tailwind CSS', 'Storybook'] },
  ],

  interviewerPersona: '당신은 경험이 풍부한 디자인 리드이자 면접관입니다.\n아래 지원자의 프로필을 참고하여, 디자인 역량과 프로세스를 평가하는 맞춤형 면접을 진행해주세요.',

  difficultyDescriptions: {
    junior: '주니어 레벨 (1-3년차). 디자인 기초, 도구 활용, 기본 프로세스에 대해 질문하세요.',
    mid: '미들 레벨 (4-7년차). 디자인 시스템 구축, 사용자 리서치 설계, 데이터 기반 디자인에 대해 질문하세요.',
    senior: '시니어 레벨 (8년차 이상). 디자인 조직 관리, 전략적 디자인 의사결정, 비즈니스 임팩트에 대해 질문하세요.',
  },

  questionCategories: ['디자인역량', '포트폴리오', '프로세스', '인성문화핏', '직무적합성'],
  categoryDistribution: '카테고리별 분포: 디자인역량 4-6개, 포트폴리오 3-4개, 프로세스 2-3개, 인성문화핏 3-4개, 직무적합성 2-3개',
  evaluationExpertType: '디자인 직무 면접 평가 전문가',
};
