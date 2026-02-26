import type { TechKnowledgeBase } from '../types';

const behavioralLeadershipKnowledge: TechKnowledgeBase = {
  techId: 'behavioral-leadership',
  displayName: '리더십/팔로워십',
  category: 'behavioral',
  version: '2026.1',
  topics: {
    junior: [
      {
        id: 'leadership-followership',
        topic: '팔로워십',
        description: '선배/리더를 따르며 효과적으로 기여하는 자세와 능력',
        sampleQuestions: [
          '좋은 팔로워란 어떤 사람이라고 생각하나요?',
          '리더의 결정에 동의하지 않았던 경험이 있나요? 어떻게 대처했나요?',
          '선배 개발자에게 배운 가장 중요한 것은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          '적극적 팔로워십에 대한 이해',
          '건설적 의견 제시 방법',
          '학습하는 자세와 겸손함'
        ],
        followUpAngles: [
          '리더의 지시가 잘못되었다고 확신할 때 어떻게 하나요?',
          '피드백을 받았을 때 감정적으로 힘들었던 경험은?',
          '주도적으로 업무 범위를 넓힌 경험이 있나요?'
        ],
        tags: ['팔로워십', '학습자세', '피드백수용']
      },
      {
        id: 'leadership-initiative',
        topic: '주도적 기여',
        description: '주어진 역할을 넘어 주도적으로 기여한 경험',
        sampleQuestions: [
          '맡은 업무 외에 주도적으로 기여한 경험이 있나요?',
          '팀에 새로운 도구나 프로세스를 제안한 적이 있나요?',
          '스스로 문제를 발견하고 해결한 경험을 말씀해주세요.'
        ],
        keyConceptsToProbe: [
          '주도성과 오너십',
          '제안의 구체성과 실행력',
          '팀에 대한 기여 의지'
        ],
        followUpAngles: [
          '제안이 받아들여지지 않았을 때는 어떻게 했나요?',
          '주도적으로 행동했다가 실패한 경험은?',
          '동료를 설득해서 함께 개선한 경험이 있나요?'
        ],
        tags: ['주도성', '오너십', '제안', '개선']
      }
    ],
    mid: [
      {
        id: 'leadership-mentoring',
        topic: '멘토링',
        description: '후배나 신입 개발자를 멘토링한 경험과 방법',
        sampleQuestions: [
          '주니어 개발자를 멘토링한 경험이 있나요? 어떻게 접근했나요?',
          '온보딩 프로세스를 개선하거나 만든 경험이 있나요?',
          '기술 지식을 팀에 전파한 방법을 말씀해주세요.'
        ],
        keyConceptsToProbe: [
          '멘토링 방법론과 접근 방식',
          '상대방 수준에 맞춘 지도 능력',
          '지식 공유 문화 기여'
        ],
        followUpAngles: [
          '멘티의 성장을 어떻게 측정했나요?',
          '멘토링이 잘 되지 않았던 경우는?',
          '본인도 멘토링을 통해 배운 점이 있나요?'
        ],
        tags: ['멘토링', '온보딩', '지식전파', '후배육성']
      },
      {
        id: 'leadership-small-team',
        topic: '소규모 팀 리딩',
        description: '소규모 팀이나 프로젝트 단위에서의 리더십 경험',
        sampleQuestions: [
          '소규모 팀을 이끈 경험에 대해 말씀해주세요.',
          '팀의 목표를 설정하고 달성까지 이끈 과정은?',
          '팀원 개개인의 강점을 어떻게 파악하고 활용했나요?'
        ],
        keyConceptsToProbe: [
          '목표 설정과 공유 방법',
          '팀원 역량 파악과 업무 배분',
          '진행 관리와 피드백'
        ],
        followUpAngles: [
          '성과가 부진한 팀원을 어떻게 대했나요?',
          '팀 내 분위기가 좋지 않았을 때 어떻게 개선했나요?',
          '리더로서 가장 어려웠던 순간은?'
        ],
        tags: ['팀리딩', '목표설정', '업무배분', '성과관리']
      }
    ],
    senior: [
      {
        id: 'leadership-org-management',
        topic: '조직 운영',
        description: '개발 조직의 구조 설계, 채용, 평가 등 조직 운영 경험',
        sampleQuestions: [
          '개발 조직을 구성하고 운영한 경험을 말씀해주세요.',
          '채용 프로세스에 어떻게 참여했고, 어떤 기준으로 사람을 뽑았나요?',
          '성과 평가 체계를 만들거나 개선한 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          '조직 구조 설계 원칙',
          '채용 기준과 프로세스',
          '공정한 평가 체계 구축'
        ],
        followUpAngles: [
          '조직이 성장하면서 구조를 변경한 경험은?',
          '잘못된 채용 결정을 내린 경험과 교훈은?',
          '저성과자를 어떻게 관리했나요?'
        ],
        tags: ['조직운영', '채용', '평가', '조직설계']
      },
      {
        id: 'leadership-strategic',
        topic: '전략적 리더십',
        description: '기술 조직의 비전 수립과 전략적 방향 설정',
        sampleQuestions: [
          '기술 조직의 비전을 수립하고 팀에 전파한 경험을 말씀해주세요.',
          '기술 로드맵을 작성하고 실행한 과정을 설명해주세요.',
          '경영진에게 기술 투자를 설득한 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          '비전 수립과 소통 능력',
          '기술 전략과 비즈니스 전략의 정렬',
          '경영진과의 소통 능력'
        ],
        followUpAngles: [
          '비전에 공감하지 못하는 팀원은 어떻게 이끌었나요?',
          '기술 로드맵이 비즈니스 변화로 수정된 경험은?',
          '기술 부채 해결을 위한 투자를 어떻게 정당화했나요?'
        ],
        tags: ['전략', '비전', '로드맵', '경영진소통']
      },
      {
        id: 'leadership-change-management',
        topic: '변화 관리',
        description: '조직 변화를 주도하고 안정적으로 정착시킨 경험',
        sampleQuestions: [
          '대규모 기술 전환이나 프로세스 변화를 이끈 경험이 있나요?',
          '변화에 대한 저항을 어떻게 극복했나요?',
          '에자일 도입이나 문화 변화를 주도한 경험을 말씀해주세요.'
        ],
        keyConceptsToProbe: [
          '변화 관리 방법론에 대한 이해',
          '저항 극복 전략',
          '변화의 정착과 지속을 위한 방법'
        ],
        followUpAngles: [
          '변화가 실패한 경험은 없나요?',
          '변화의 속도를 어떻게 조절했나요?',
          '변화 후 조직의 반응과 성과 변화는?'
        ],
        tags: ['변화관리', '기술전환', '프로세스개선', '저항극복']
      }
    ]
  },
  commonMistakes: [
    '리더십 경험을 직급이나 직책으로만 설명 (구체적 행동 부재)',
    '모든 성과를 본인의 리더십 덕분이라고 주장',
    '실패 경험이나 어려움을 인정하지 않음',
    '리더십과 관리(management)를 구분하지 못함',
    '팔로워십의 중요성을 간과'
  ],
  bestPractices: [
    '구체적 상황에서의 리더십 행동과 결과를 STAR 구조로 설명',
    '팀원 성장에 기여한 실제 사례 공유',
    '리더십 스타일에 대한 자기인식 보여주기',
    '실패에서 배운 리더십 교훈 솔직하게 공유',
    '상황에 따라 리더십 스타일을 조정한 경험 제시'
  ],
  relatedTechnologies: ['behavioral-collaboration', 'behavioral-career', 'behavioral-culture-fit']
};

export default behavioralLeadershipKnowledge;
