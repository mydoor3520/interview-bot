import type { TechKnowledgeBase } from '../types';

const behavioralCareerKnowledge: TechKnowledgeBase = {
  techId: 'behavioral-career',
  displayName: '커리어 비전',
  category: 'behavioral',
  version: '2026.1',
  topics: {
    junior: [
      {
        id: 'career-short-term',
        topic: '단기 목표',
        description: '입사 후 1~2년 내의 구체적인 성장 목표',
        sampleQuestions: [
          '입사 후 1년 동안의 목표는 무엇인가요?',
          '단기적으로 가장 집중하고 싶은 기술 영역은?',
          '첫 6개월 동안 어떤 성과를 내고 싶으신가요?'
        ],
        keyConceptsToProbe: [
          '현실적이면서 구체적인 목표 설정',
          '목표와 포지션의 연관성',
          '성장에 대한 의지와 계획'
        ],
        followUpAngles: [
          '그 목표를 달성하기 위한 구체적 행동 계획은?',
          '목표 달성을 어떻게 측정할 건가요?',
          '예상보다 적응이 어려울 경우 어떻게 대처할 건가요?'
        ],
        tags: ['단기목표', '성장계획', '적응']
      },
      {
        id: 'career-learning-plan',
        topic: '학습 계획',
        description: '지속적 학습과 자기 개발에 대한 계획과 방법',
        sampleQuestions: [
          '새로운 기술을 어떻게 학습하시나요?',
          '최근에 학습한 기술이나 개념은 무엇인가요?',
          '학습과 업무의 균형을 어떻게 유지하나요?'
        ],
        keyConceptsToProbe: [
          '효과적인 학습 방법론',
          '자기주도적 학습 습관',
          '학습의 실무 적용 능력'
        ],
        followUpAngles: [
          '학습한 내용을 프로젝트에 적용한 경험은?',
          '학습 동기가 떨어질 때 어떻게 극복하나요?',
          '기술 커뮤니티 활동이나 오픈소스 기여 경험은?'
        ],
        tags: ['학습', '자기개발', '기술성장']
      }
    ],
    mid: [
      {
        id: 'career-midterm-plan',
        topic: '중장기 커리어 계획',
        description: '3~5년 후의 커리어 방향과 전략적 계획',
        sampleQuestions: [
          '3년 후, 5년 후 어떤 개발자가 되어 있고 싶으신가요?',
          '매니저 트랙과 개인 기여자(IC) 트랙 중 어떤 방향을 선호하나요?',
          '커리어에서 가장 중요하게 생각하는 가치는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          '장기적 커리어 비전의 명확성',
          '트랙 선택에 대한 이해와 근거',
          '가치관과 커리어의 일관성'
        ],
        followUpAngles: [
          '그 방향을 선택한 이유는 무엇인가요?',
          '커리어 계획이 바뀐 적이 있나요? 왜?',
          '이 회사에서 그 계획을 어떻게 실현할 수 있다고 생각하나요?'
        ],
        tags: ['중장기계획', '커리어트랙', '가치관']
      },
      {
        id: 'career-expertise',
        topic: '전문성 구축',
        description: '특정 기술 도메인에서의 전문성 구축 전략',
        sampleQuestions: [
          '본인의 전문 분야는 무엇이고, 어떻게 전문성을 쌓아왔나요?',
          'T자형 인재에 대해 어떻게 생각하시나요?',
          '기술 트렌드 변화에 어떻게 대응하고 있나요?'
        ],
        keyConceptsToProbe: [
          '전문성의 깊이와 넓이 균형',
          '전문성 구축을 위한 체계적 노력',
          '기술 변화에 대한 적응력'
        ],
        followUpAngles: [
          '전문 분야를 전환하거나 확장한 경험은?',
          '전문성을 팀에 어떻게 전파하고 있나요?',
          '본인의 전문성이 시장에서 어떤 가치를 갖는다고 생각하나요?'
        ],
        tags: ['전문성', 'T자형인재', '기술트렌드', '도메인전문가']
      }
    ],
    senior: [
      {
        id: 'career-tech-leadership-vision',
        topic: '기술 리더십 비전',
        description: '기술 리더로서의 장기적 비전과 영향력',
        sampleQuestions: [
          '기술 리더로서의 본인의 비전은 무엇인가요?',
          '기술 생태계에 어떤 영향을 미치고 싶으신가요?',
          '10년 후의 본인 모습을 그려본다면?'
        ],
        keyConceptsToProbe: [
          '장기 비전의 구체성과 실현 가능성',
          '기술 생태계에 대한 넓은 시야',
          '영향력 확대에 대한 방향성'
        ],
        followUpAngles: [
          '그 비전을 실현하기 위한 현재의 노력은?',
          '기술 리더로서 가장 큰 도전은 무엇이라 생각하나요?',
          '비전이 현실과 충돌할 때 어떻게 조정하나요?'
        ],
        tags: ['기술리더십', '비전', '영향력', '장기목표']
      },
      {
        id: 'career-org-growth',
        topic: '조직 성장 기여',
        description: '기술 조직의 성장과 발전에 대한 기여 방향',
        sampleQuestions: [
          '기술 조직을 성장시키기 위해 가장 중요한 것은 무엇이라 생각하나요?',
          '인재 육성과 조직 역량 강화를 위해 어떤 노력을 해왔나요?',
          '기술 조직의 문화를 어떻게 형성하고 싶으신가요?'
        ],
        keyConceptsToProbe: [
          '조직 성장에 대한 체계적 사고',
          '인재 육성 철학과 방법론',
          '기술 문화 형성에 대한 비전'
        ],
        followUpAngles: [
          '조직이 빠르게 성장할 때 가장 큰 도전은?',
          '기술 조직의 생산성을 어떻게 측정하나요?',
          '외부 인재 영입과 내부 육성의 균형은?'
        ],
        tags: ['조직성장', '인재육성', '기술문화', '역량강화']
      }
    ]
  },
  commonMistakes: [
    '비현실적이거나 너무 모호한 커리어 목표 제시',
    '회사와 무관한 개인적 목표만 나열',
    '트렌드만 좇는 커리어 계획 (본인만의 방향 부재)',
    '현재 역량과 목표 사이의 갭을 인지하지 못함',
    '커리어 계획에 대한 진정성 부족 (면접용 답변)'
  ],
  bestPractices: [
    '단기-중기-장기 목표의 일관된 연결고리 제시',
    '회사 성장과 개인 성장의 연결점 강조',
    '구체적인 실행 계획과 마일스톤 제시',
    '과거 경험에서 커리어 방향을 정한 이유 설명',
    '유연성과 적응력도 함께 보여주기'
  ],
  relatedTechnologies: ['behavioral-self-intro', 'behavioral-motivation', 'behavioral-leadership']
};

export default behavioralCareerKnowledge;
