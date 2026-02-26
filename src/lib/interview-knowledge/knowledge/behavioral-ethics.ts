import type { TechKnowledgeBase } from '../types';

const behavioralEthicsKnowledge: TechKnowledgeBase = {
  techId: 'behavioral-ethics',
  displayName: '직업윤리',
  category: 'behavioral',
  version: '2026.1',
  topics: {
    junior: [
      {
        id: 'ethics-basic-awareness',
        topic: '기본 윤리 의식',
        description: '개발자로서의 기본적인 직업 윤리와 책임감에 대한 인식',
        sampleQuestions: [
          '개발자의 직업 윤리에서 가장 중요한 것은 무엇이라 생각하나요?',
          '코드 품질과 일정 사이에서 타협해야 할 때 어떻게 판단하나요?',
          '개인정보 보호에 대해 개발자가 어떤 책임을 져야 한다고 생각하나요?'
        ],
        keyConceptsToProbe: [
          '기본적인 윤리 의식과 가치관',
          '품질과 일정의 트레이드오프에 대한 사고',
          '데이터 보호에 대한 인식'
        ],
        followUpAngles: [
          '품질을 타협해야 했던 구체적 경험은?',
          '개인정보를 다루는 코드를 작성한 경험이 있나요?',
          '동료가 불안전한 코드를 커밋하려 할 때 어떻게 하나요?'
        ],
        tags: ['윤리의식', '품질', '개인정보보호', '책임감']
      },
      {
        id: 'ethics-responsibility',
        topic: '책임감',
        description: '업무에 대한 책임감과 신뢰성',
        sampleQuestions: [
          '업무에서 실수를 했을 때 어떻게 대처하시나요?',
          '약속한 일정을 못 지킬 것 같을 때 어떻게 하시나요?',
          '본인의 코드에서 버그가 발견되었을 때 어떻게 대응하나요?'
        ],
        keyConceptsToProbe: [
          '실수에 대한 솔직한 대처',
          '사전 소통의 중요성 인식',
          '문제 해결에 대한 오너십'
        ],
        followUpAngles: [
          '실수를 숨기고 싶었던 적은 없나요?',
          '일정 지연을 사전에 알려서 좋은 결과가 나온 경험은?',
          '남이 만든 버그를 수정해야 할 때의 태도는?'
        ],
        tags: ['책임감', '실수대처', '오너십', '신뢰']
      }
    ],
    mid: [
      {
        id: 'ethics-dilemma',
        topic: '윤리적 딜레마 대처',
        description: '업무 중 직면하는 윤리적 딜레마에 대한 판단과 행동',
        sampleQuestions: [
          '업무에서 윤리적으로 고민했던 상황이 있나요?',
          '상사의 지시가 윤리적으로 문제가 있다고 느꼈을 때 어떻게 대처하셨나요?',
          '사용자 데이터를 비윤리적으로 활용하라는 요청을 받으면 어떻게 하시겠어요?'
        ],
        keyConceptsToProbe: [
          '윤리적 상황 인식 능력',
          '원칙 있는 의사결정 과정',
          '조직과 윤리 사이의 균형'
        ],
        followUpAngles: [
          '그 상황에서 다른 사람들은 어떻게 반응했나요?',
          '윤리적 판단의 기준은 어디서 비롯되었나요?',
          '윤리적 결정으로 인해 불이익을 받은 적이 있나요?'
        ],
        tags: ['윤리적딜레마', '의사결정', '원칙', '데이터윤리']
      },
      {
        id: 'ethics-stakeholder',
        topic: '이해관계자 관리',
        description: '다양한 이해관계자의 이익을 균형있게 고려하는 능력',
        sampleQuestions: [
          '서로 다른 이해관계자의 요구가 충돌할 때 어떻게 조율하시나요?',
          '비즈니스 요구와 사용자 경험이 충돌한 경험이 있나요?',
          '기술적으로 옳은 결정과 비즈니스적으로 필요한 결정이 다를 때 어떻게 하나요?'
        ],
        keyConceptsToProbe: [
          '이해관계자 파악 능력',
          '균형잡힌 의사결정',
          '투명한 소통과 협상'
        ],
        followUpAngles: [
          '모든 이해관계자를 만족시킬 수 없었던 경험은?',
          '기술 부채를 쌓으면서 비즈니스 요구를 맞춘 경험은?',
          '사용자 편의를 위해 회사 이익을 양보한 적이 있나요?'
        ],
        tags: ['이해관계자', '균형', '의사결정', '비즈니스']
      }
    ],
    senior: [
      {
        id: 'ethics-org-system',
        topic: '조직 윤리 체계 수립',
        description: '조직 차원의 윤리 기준과 가이드라인을 수립하고 실천하는 리더십',
        sampleQuestions: [
          '개발 조직의 윤리 기준이나 가이드라인을 만든 경험이 있나요?',
          '코드 리뷰, 보안 정책 등 윤리적 관행을 조직에 정착시킨 방법은?',
          'AI 윤리나 데이터 윤리에 대한 조직적 대응을 이끈 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          '체계적인 윤리 프레임워크 구축',
          '윤리 관행의 조직 내 정착',
          'AI/데이터 윤리에 대한 시야'
        ],
        followUpAngles: [
          '윤리 기준을 위반한 사례는 어떻게 대응했나요?',
          '윤리와 비즈니스 성과 사이의 트레이드오프는?',
          '규제 변화에 어떻게 대응했나요?'
        ],
        tags: ['조직윤리', '가이드라인', 'AI윤리', '데이터윤리']
      },
      {
        id: 'ethics-leadership',
        topic: '윤리적 리더십',
        description: '윤리적 가치를 실천하고 조직에 전파하는 리더십',
        sampleQuestions: [
          '윤리적 리더십이란 무엇이라고 생각하나요?',
          '어려운 상황에서 원칙을 지킨 경험을 말씀해주세요.',
          '팀에 윤리적 의사결정 문화를 심기 위해 어떤 노력을 했나요?'
        ],
        keyConceptsToProbe: [
          '윤리적 리더십에 대한 철학',
          '원칙을 지키는 용기와 일관성',
          '윤리 문화 전파 방법'
        ],
        followUpAngles: [
          '원칙을 지키기 어려웠던 압박 상황은?',
          '팀원의 비윤리적 행동을 발견했을 때 어떻게 대처했나요?',
          '윤리적 결정이 장기적으로 조직에 이익이 된 사례는?'
        ],
        tags: ['윤리적리더십', '원칙', '문화전파', '의사결정']
      }
    ]
  },
  commonMistakes: [
    '윤리적 딜레마를 경험한 적이 없다고 답변',
    '원론적이고 교과서적인 답변만 나열',
    '실제 행동 없이 가치관만 언급',
    '회사 이익과 윤리의 충돌을 인정하지 않음',
    '모든 상황에서 윤리가 무조건 우선이라는 비현실적 답변'
  ],
  bestPractices: [
    '구체적 윤리적 딜레마 상황과 본인의 판단 과정을 STAR 구조로 설명',
    '윤리적 기준의 근거를 명확히 제시',
    '현실적 트레이드오프를 인정하면서 원칙적 입장 표현',
    '조직 내 윤리 문화 개선에 기여한 사례 공유',
    '결과뿐 아니라 의사결정 과정의 투명성 강조'
  ],
  relatedTechnologies: ['behavioral-culture-fit', 'behavioral-situational', 'behavioral-leadership']
};

export default behavioralEthicsKnowledge;
