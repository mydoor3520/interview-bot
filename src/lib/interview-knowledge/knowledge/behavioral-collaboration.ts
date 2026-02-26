import type { TechKnowledgeBase } from '../types';

const behavioralCollaborationKnowledge: TechKnowledgeBase = {
  techId: 'behavioral-collaboration',
  displayName: '협업/갈등 해결',
  category: 'behavioral',
  version: '2026.1',
  topics: {
    junior: [
      {
        id: 'collab-teamwork',
        topic: '팀 내 협업 경험',
        description: '팀 프로젝트에서의 협업 방식과 소통 능력 평가',
        sampleQuestions: [
          '팀 프로젝트에서 다른 팀원과 어떻게 협업했는지 구체적으로 말씀해주세요.',
          '코드 리뷰를 주고받은 경험이 있나요? 어떤 점을 배웠나요?',
          '팀에서 본인의 역할은 주로 어떤 편이었나요?'
        ],
        keyConceptsToProbe: [
          '협업 도구와 프로세스에 대한 이해',
          '동료와의 소통 방식',
          '팀 내 역할에 대한 자기인식'
        ],
        followUpAngles: [
          '협업이 잘 되었던 경험과 그렇지 못했던 경험의 차이는?',
          '원격 근무에서의 협업 경험이 있나요?',
          '코드 리뷰에서 피드백을 받았을 때 어떻게 반응했나요?'
        ],
        tags: ['협업', '소통', '코드리뷰', '팀워크']
      },
      {
        id: 'collab-opinion',
        topic: '의견 조율',
        description: '팀 내에서 의견이 다를 때 조율하는 방법',
        sampleQuestions: [
          '팀원과 기술적 의견이 달랐던 경험이 있나요? 어떻게 해결했나요?',
          '본인의 의견이 받아들여지지 않았을 때 어떻게 대처했나요?',
          '팀 회의에서 본인의 의견을 어떻게 전달하는 편인가요?'
        ],
        keyConceptsToProbe: [
          '논리적 의견 전달 능력',
          '다른 의견에 대한 열린 자세',
          '합의를 이끌어내는 방법'
        ],
        followUpAngles: [
          '상대방의 의견이 더 나았다고 인정한 적이 있나요?',
          '의견 충돌이 장기화되었을 때는 어떻게 했나요?',
          '문서화나 데이터로 의견을 뒷받침한 경험은?'
        ],
        tags: ['의견조율', '소통', '합의', '설득']
      }
    ],
    mid: [
      {
        id: 'collab-conflict-resolution',
        topic: '갈등 해결 사례',
        description: '팀 내 갈등 상황을 인지하고 해결한 구체적 경험',
        sampleQuestions: [
          '팀 내에서 갈등이 발생했던 구체적인 사례를 말씀해주세요.',
          '동료와의 갈등을 어떻게 해결했고, 그 결과는 어떠했나요?',
          '갈등 상황에서 본인이 취한 행동의 근거는 무엇이었나요?'
        ],
        keyConceptsToProbe: [
          '갈등의 근본 원인 파악 능력',
          '해결을 위한 구체적 행동',
          '결과와 관계 회복 여부'
        ],
        followUpAngles: [
          '갈등 후 그 동료와의 관계는 어떻게 되었나요?',
          '같은 상황이 반복된다면 다르게 할 부분이 있나요?',
          '갈등을 사전에 예방하기 위한 방법은?'
        ],
        tags: ['갈등해결', '대인관계', '커뮤니케이션']
      },
      {
        id: 'collab-cross-team',
        topic: '크로스팀 협업',
        description: '다른 팀이나 직군과의 협업 경험과 방법',
        sampleQuestions: [
          '다른 팀(기획, 디자인, QA 등)과 협업한 경험을 말씀해주세요.',
          '비개발 직군과 기술적 내용을 어떻게 소통했나요?',
          '팀 간 의존성이 있는 프로젝트에서 조율한 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          '비기술 직군과의 소통 능력',
          '팀 간 의존성 관리',
          '공통 목표 설정과 달성 과정'
        ],
        followUpAngles: [
          '기획 변경이 잦을 때 어떻게 대응했나요?',
          '팀 간 우선순위가 달랐을 때는?',
          '효과적이었던 크로스팀 협업 도구나 프로세스는?'
        ],
        tags: ['크로스팀', '직군협업', '소통', '조율']
      },
      {
        id: 'collab-communication',
        topic: '의사소통 스킬',
        description: '효과적인 의사소통을 위한 방법과 경험',
        sampleQuestions: [
          '복잡한 기술적 개념을 비개발자에게 설명한 경험이 있나요?',
          '팀 내 소통 문화를 개선한 경험이 있다면 말씀해주세요.',
          '문서화를 통해 팀 협업을 개선한 사례가 있나요?'
        ],
        keyConceptsToProbe: [
          '상대방 수준에 맞춘 설명 능력',
          '문서화 습관과 지식 공유',
          '소통 채널과 방법의 적절한 선택'
        ],
        followUpAngles: [
          '비동기 소통과 동기 소통을 어떻게 구분해서 사용하나요?',
          'RFC나 ADR 같은 의사결정 문서를 작성한 경험은?',
          '미스커뮤니케이션으로 인한 문제를 경험한 적이 있나요?'
        ],
        tags: ['의사소통', '문서화', '지식공유', '설명력']
      }
    ],
    senior: [
      {
        id: 'collab-org-mediation',
        topic: '조직간 갈등 중재',
        description: '팀 간 또는 부서 간 갈등을 중재하고 해결한 리더십 경험',
        sampleQuestions: [
          '팀 간 기술적 방향성 충돌을 중재한 경험을 말씀해주세요.',
          '조직 간 리소스 경쟁이나 우선순위 갈등을 어떻게 해결했나요?',
          '정치적으로 민감한 상황에서의 갈등 해결 경험은?'
        ],
        keyConceptsToProbe: [
          '조직 정치에 대한 이해와 대응 능력',
          '다수 이해관계자 간 합의 도출',
          '장기적 관계를 유지하면서 문제 해결'
        ],
        followUpAngles: [
          '양쪽 모두 만족시킬 수 없었던 경우 어떻게 했나요?',
          '경영진의 결정과 팀의 의견이 다를 때는?',
          '갈등 중재 후 신뢰를 구축한 방법은?'
        ],
        tags: ['조직갈등', '중재', '이해관계자', '정치']
      },
      {
        id: 'collab-culture',
        topic: '문화 형성',
        description: '건강한 협업 문화를 만들고 유지한 리더십 경험',
        sampleQuestions: [
          '팀의 협업 문화를 개선하거나 새로 만든 경험이 있나요?',
          '심리적 안전감(Psychological Safety)을 높이기 위해 어떤 노력을 했나요?',
          '원격/하이브리드 환경에서 팀 문화를 유지한 방법은?'
        ],
        keyConceptsToProbe: [
          '문화 형성을 위한 구체적 실천 사항',
          '심리적 안전감에 대한 이해',
          '문화 변화의 측정과 지속 방법'
        ],
        followUpAngles: [
          '문화 변화에 저항하는 팀원은 어떻게 대했나요?',
          '좋은 문화가 성과로 이어진 구체적 사례는?',
          '팀 규모가 커지면서 문화가 변한 경험은?'
        ],
        tags: ['문화형성', '심리적안전감', '팀빌딩']
      },
      {
        id: 'collab-diversity',
        topic: '다양성 관리',
        description: '다양한 배경의 팀원들과의 포용적 협업 경험',
        sampleQuestions: [
          '다양한 배경(경력, 문화, 세대)의 팀원들과 협업한 경험을 말씀해주세요.',
          '주니어와 시니어 간의 소통 격차를 어떻게 해소했나요?',
          '다양성이 팀 성과에 긍정적 영향을 미친 사례가 있나요?'
        ],
        keyConceptsToProbe: [
          '다양성에 대한 인식과 존중',
          '포용적 환경 조성을 위한 노력',
          '다양성을 강점으로 활용한 경험'
        ],
        followUpAngles: [
          '문화적 차이로 인한 오해를 해결한 경험은?',
          '경력 차이가 큰 팀에서 균형을 맞춘 방법은?',
          '무의식적 편견(Unconscious Bias)에 대해 어떻게 대처하나요?'
        ],
        tags: ['다양성', '포용', '세대차이', '문화차이']
      }
    ]
  },
  commonMistakes: [
    '갈등 경험이 없다고 답변 (비현실적)',
    '상대방을 일방적으로 비난하며 설명',
    '구체적 상황 없이 원론적 답변만 나열',
    '결과나 교훈 없이 갈등 상황만 설명',
    '본인의 역할을 과장하거나 축소'
  ],
  bestPractices: [
    'STAR 구조로 구체적 갈등 상황과 해결 과정 설명',
    '상대방의 입장도 이해하고 있음을 보여주기',
    '갈등 해결 후 관계 회복까지 포함하여 설명',
    '갈등에서 배운 교훈과 이후 변화 공유',
    '감정적 표현보다 사실 기반의 객관적 서술'
  ],
  relatedTechnologies: ['behavioral-leadership', 'behavioral-culture-fit', 'behavioral-project']
};

export default behavioralCollaborationKnowledge;
