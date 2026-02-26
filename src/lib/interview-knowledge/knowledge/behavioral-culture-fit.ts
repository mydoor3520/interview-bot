import type { TechKnowledgeBase } from '../types';

const behavioralCultureFitKnowledge: TechKnowledgeBase = {
  techId: 'behavioral-culture-fit',
  displayName: '조직문화 적합성',
  category: 'behavioral',
  version: '2026.1',
  topics: {
    junior: [
      {
        id: 'culture-adaptation',
        topic: '팀 적응',
        description: '새로운 팀과 환경에 적응하는 능력과 방법',
        sampleQuestions: [
          '새로운 팀에 합류했을 때 어떻게 적응하시나요?',
          '팀의 기존 코드베이스에 적응한 경험을 말씀해주세요.',
          '팀의 업무 방식이 본인과 맞지 않을 때 어떻게 하시나요?'
        ],
        keyConceptsToProbe: [
          '적응 전략과 능동적 자세',
          '기존 문화에 대한 존중',
          '유연성과 열린 마음'
        ],
        followUpAngles: [
          '적응하는 데 가장 어려웠던 점은 무엇이었나요?',
          '팀 규칙이나 관습 중 이해하기 어려웠던 것은?',
          '적응 기간 동안 도움을 구한 방법은?'
        ],
        tags: ['적응', '유연성', '열린자세']
      },
      {
        id: 'culture-work-style',
        topic: '업무 스타일',
        description: '본인의 업무 방식과 선호하는 환경에 대한 자기인식',
        sampleQuestions: [
          '본인의 업무 스타일을 어떻게 설명하시겠어요?',
          '가장 생산적으로 일할 수 있는 환경은 어떤 것인가요?',
          '업무 우선순위를 어떻게 정하시나요?'
        ],
        keyConceptsToProbe: [
          '자기인식의 정확성',
          '업무 환경에 대한 현실적 기대',
          '시간/업무 관리 방법'
        ],
        followUpAngles: [
          '선호하는 환경이 아닐 때 어떻게 적응하나요?',
          '독립적 업무와 협업 중 어느 것을 선호하나요?',
          '야근이나 급한 업무에 대한 생각은?'
        ],
        tags: ['업무스타일', '자기인식', '업무환경', '생산성']
      }
    ],
    mid: [
      {
        id: 'culture-contribution',
        topic: '문화 기여',
        description: '팀 문화에 긍정적으로 기여한 경험과 방법',
        sampleQuestions: [
          '팀 문화를 개선하거나 긍정적으로 기여한 경험이 있나요?',
          '팀 내 지식 공유 문화를 만든 경험을 말씀해주세요.',
          '팀의 개발 프로세스를 개선한 사례가 있나요?'
        ],
        keyConceptsToProbe: [
          '문화 기여에 대한 주도성',
          '구체적인 개선 사례와 결과',
          '동료에 대한 영향력'
        ],
        followUpAngles: [
          '그 변화에 저항하는 팀원은 없었나요?',
          '문화 개선이 팀 성과에 어떤 영향을 미쳤나요?',
          '실패했던 문화 개선 시도가 있나요?'
        ],
        tags: ['문화기여', '지식공유', '프로세스개선']
      },
      {
        id: 'culture-values',
        topic: '가치관 정렬',
        description: '개인 가치관과 조직 가치관의 정렬 및 공존',
        sampleQuestions: [
          '일할 때 가장 중요하게 생각하는 가치는 무엇인가요?',
          '회사의 가치관과 본인의 가치관이 충돌했던 경험이 있나요?',
          '이상적인 개발 문화란 어떤 것이라고 생각하나요?'
        ],
        keyConceptsToProbe: [
          '핵심 가치관의 명확성',
          '가치 충돌 시 대처 방법',
          '이상적 문화에 대한 구체적 비전'
        ],
        followUpAngles: [
          '그 가치관을 형성하게 된 계기는?',
          '가치관이 다른 동료와 어떻게 협업하나요?',
          '회사의 가치관에 동의하지 않을 때 한계선은 어디인가요?'
        ],
        tags: ['가치관', '문화적합성', '개발문화']
      }
    ],
    senior: [
      {
        id: 'culture-formation',
        topic: '문화 형성/전파',
        description: '조직 문화를 새로 만들거나 변화시킨 리더십 경험',
        sampleQuestions: [
          '개발 조직의 문화를 새로 형성하거나 바꾼 경험을 말씀해주세요.',
          '엔지니어링 문화의 핵심 요소는 무엇이라고 생각하나요?',
          '문화가 조직 성과에 미치는 영향을 체감한 사례가 있나요?'
        ],
        keyConceptsToProbe: [
          '문화 형성을 위한 체계적 접근',
          '문화와 성과의 연결에 대한 이해',
          '지속 가능한 문화 유지 방법'
        ],
        followUpAngles: [
          '문화 변화의 성과를 어떻게 측정했나요?',
          '조직이 커지면서 문화가 희석된 경험은?',
          'M&A나 조직 합병 시 문화 통합 경험은?'
        ],
        tags: ['문화형성', '엔지니어링문화', '조직변화']
      },
      {
        id: 'culture-values-driven',
        topic: '조직 가치 주도',
        description: '조직의 핵심 가치를 정의하고 실천하도록 이끈 경험',
        sampleQuestions: [
          '조직의 핵심 가치를 정의하거나 재정립한 경험이 있나요?',
          '가치 기반의 의사결정을 실천한 사례를 말씀해주세요.',
          '문화와 비즈니스 성과를 동시에 추구한 방법은?'
        ],
        keyConceptsToProbe: [
          '가치 정의 프로세스',
          '가치의 일상적 실천 방법',
          '문화와 성과의 양립'
        ],
        followUpAngles: [
          '가치에 어긋나는 높은 성과자를 어떻게 다루나요?',
          '가치가 실제로 의사결정에 영향을 미친 사례는?',
          '가치를 새 팀원에게 어떻게 전달하나요?'
        ],
        tags: ['가치주도', '의사결정', '문화실천']
      }
    ]
  },
  commonMistakes: [
    '회사 문화를 조사하지 않고 일반적인 답변',
    '본인의 업무 스타일에 대한 자기인식 부족',
    '문화 적합성을 단순히 "분위기 좋은 팀" 정도로 이해',
    '회사 가치를 단순히 반복하며 진정성 결여',
    '모든 문화에 다 맞는다는 비현실적 답변'
  ],
  bestPractices: [
    '회사의 미션/비전/가치를 사전에 조사하고 본인과의 연결점 제시',
    '구체적 경험을 통해 문화적 적합성 입증',
    '본인의 업무 스타일을 솔직하게 설명하되 유연성도 보여주기',
    '문화에 기여할 수 있는 구체적 방법 제안',
    '가치관 충돌 시 대처 방법에 대한 성숙한 관점 제시'
  ],
  relatedTechnologies: ['behavioral-collaboration', 'behavioral-ethics', 'behavioral-motivation']
};

export default behavioralCultureFitKnowledge;
