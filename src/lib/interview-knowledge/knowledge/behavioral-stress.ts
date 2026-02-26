import type { TechKnowledgeBase } from '../types';

const behavioralStressKnowledge: TechKnowledgeBase = {
  techId: 'behavioral-stress',
  displayName: '스트레스/위기 관리',
  category: 'behavioral',
  version: '2026.1',
  topics: {
    junior: [
      {
        id: 'stress-coping',
        topic: '스트레스 대처법',
        description: '업무 스트레스를 인식하고 건강하게 관리하는 방법',
        sampleQuestions: [
          '업무 스트레스를 어떻게 관리하시나요?',
          '가장 스트레스를 받았던 업무 경험은 무엇이었나요?',
          '번아웃을 경험한 적이 있나요? 어떻게 극복했나요?'
        ],
        keyConceptsToProbe: [
          '스트레스 인식 능력',
          '건강한 대처 방법',
          '업무와 개인 생활의 균형'
        ],
        followUpAngles: [
          '스트레스 상황에서 생산성을 유지하는 본인만의 방법은?',
          '도움을 요청한 경험이 있나요?',
          '스트레스가 업무 품질에 영향을 미쳤던 적은?'
        ],
        tags: ['스트레스', '대처', '번아웃', '워라밸']
      },
      {
        id: 'stress-deadline',
        topic: '데드라인 관리',
        description: '촉박한 일정에서의 우선순위 설정과 시간 관리',
        sampleQuestions: [
          '데드라인이 촉박할 때 어떻게 대응하시나요?',
          '일정을 맞추기 위해 범위를 줄인 경험이 있나요?',
          '동시에 여러 마감이 겹칠 때 어떻게 우선순위를 정하시나요?'
        ],
        keyConceptsToProbe: [
          '우선순위 설정 기준',
          '시간 관리 방법',
          '범위 조정에 대한 판단력'
        ],
        followUpAngles: [
          '데드라인을 못 지킨 경험은 있나요?',
          '상사에게 일정 연장을 요청한 적이 있나요?',
          'MVP 관점에서 범위를 줄인 구체적 사례는?'
        ],
        tags: ['데드라인', '시간관리', '우선순위', '범위관리']
      }
    ],
    mid: [
      {
        id: 'stress-pressure',
        topic: '압박 상황 대응',
        description: '높은 압박감 속에서 냉정하게 판단하고 행동하는 능력',
        sampleQuestions: [
          '서비스 장애나 긴급 상황에서 대응한 경험을 말씀해주세요.',
          '경영진의 압박 속에서 기술적 결정을 내린 경험은?',
          '높은 트래픽이나 성능 이슈를 긴급하게 해결한 사례는?'
        ],
        keyConceptsToProbe: [
          '위기 상황에서의 냉정한 판단력',
          '체계적인 문제 해결 접근',
          '팀과의 효과적 소통'
        ],
        followUpAngles: [
          '장애 대응 중 가장 어려웠던 판단은?',
          '사후 분석(Post-mortem)을 진행한 경험은?',
          '재발 방지를 위해 어떤 조치를 취했나요?'
        ],
        tags: ['압박대응', '장애대응', '긴급상황', '판단력']
      },
      {
        id: 'stress-multitasking',
        topic: '멀티태스킹',
        description: '여러 업무를 동시에 효과적으로 처리하는 능력',
        sampleQuestions: [
          '여러 프로젝트를 동시에 진행한 경험이 있나요?',
          '예상치 못한 긴급 업무가 들어왔을 때 기존 업무와 어떻게 병행하나요?',
          '컨텍스트 스위칭 비용을 줄이기 위한 본인만의 방법은?'
        ],
        keyConceptsToProbe: [
          '업무 전환 관리 능력',
          '동시 진행 프로젝트 간 우선순위 조절',
          '집중력 유지 방법'
        ],
        followUpAngles: [
          '멀티태스킹으로 인해 품질이 떨어진 경험은?',
          '업무를 거절하거나 위임한 경험은?',
          '팀원에게 효과적으로 업무를 분배한 방법은?'
        ],
        tags: ['멀티태스킹', '업무관리', '컨텍스트스위칭', '위임']
      }
    ],
    senior: [
      {
        id: 'stress-crisis-management',
        topic: '위기 관리',
        description: '조직 차원의 위기 상황을 관리하고 해결하는 리더십',
        sampleQuestions: [
          '조직 차원의 기술 위기를 관리한 경험을 말씀해주세요.',
          '보안 사고나 대규모 장애를 이끌며 해결한 경험은?',
          '위기 상황에서 이해관계자(경영진, 고객)와 어떻게 소통했나요?'
        ],
        keyConceptsToProbe: [
          '위기 관리 프로세스와 리더십',
          '이해관계자 커뮤니케이션',
          '위기를 기회로 전환한 경험'
        ],
        followUpAngles: [
          '위기 대응 매뉴얼이나 프로세스를 만든 경험은?',
          '위기 상황에서 잘못된 판단을 내린 적은?',
          '위기 후 조직이 어떻게 변화했나요?'
        ],
        tags: ['위기관리', '장애대응', '보안사고', '리더십']
      },
      {
        id: 'stress-org-resilience',
        topic: '조직 리질리언스',
        description: '조직이 어려움을 극복하고 회복하는 힘을 키우는 리더십',
        sampleQuestions: [
          '팀이 어려운 시기를 겪었을 때 어떻게 팀을 이끌었나요?',
          '조직 구조 변경이나 대규모 레이오프 상황에서의 리더십 경험은?',
          '팀의 사기가 떨어졌을 때 어떻게 회복시켰나요?'
        ],
        keyConceptsToProbe: [
          '어려운 상황에서의 팀 관리',
          '조직 회복력 구축 방법',
          '투명한 소통과 신뢰 유지'
        ],
        followUpAngles: [
          '본인도 힘든 상황에서 팀을 이끄는 것이 어렵지 않았나요?',
          '핵심 인재 이탈을 방지한 방법은?',
          '어려운 메시지를 전달해야 했던 경험은?'
        ],
        tags: ['리질리언스', '팀사기', '회복력', '변화관리']
      }
    ]
  },
  commonMistakes: [
    '스트레스를 받지 않는다는 비현실적 답변',
    '구체적 대처 방법 없이 "잘 관리합니다"라고만 답변',
    '위기 상황에서의 감정적 반응을 숨기려 함',
    '모든 것을 혼자 해결했다고 주장',
    '스트레스 상황의 원인을 모두 외부 탓으로 돌림'
  ],
  bestPractices: [
    '구체적 스트레스 상황과 대처 과정을 STAR 구조로 설명',
    '건강한 스트레스 관리 방법을 실제 경험과 함께 제시',
    '위기 상황에서 배운 교훈과 이후 개선 사항 공유',
    '도움을 요청하는 것도 중요한 능력임을 보여주기',
    '감정적 어려움도 인정하면서 극복 과정을 설명'
  ],
  relatedTechnologies: ['behavioral-situational', 'behavioral-leadership', 'behavioral-project']
};

export default behavioralStressKnowledge;
