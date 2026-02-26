export interface DemoQuestion {
  question: string;
  followUp: string;
  expectedKeyPoints: string[];
  followUpExpectedKeyPoints: string[];
  sampleFeedback: {
    score: number;
    strengths: string[];
    improvements: string[];
    tip: string;
  };
}

export const DEMO_QUESTIONS: Record<string, DemoQuestion[]> = {
  developer: [
    {
      question: 'React에서 상태 관리를 할 때 useState와 useReducer를 각각 어떤 상황에서 사용하시나요?',
      followUp: 'Context API와 전역 상태 관리 라이브러리(Redux, Zustand 등)는 언제 사용하시나요?',
      expectedKeyPoints: [
        'useState는 단순 상태, useReducer는 복잡한 상태 로직에 적합',
        '상태 업데이트 로직의 복잡도에 따른 선택 기준',
        '실제 프로젝트에서의 사용 사례',
        '성능 최적화 관점에서의 고려사항',
      ],
      followUpExpectedKeyPoints: [
        'Context API의 리렌더링 문제와 해결 방법',
        '전역 상태와 로컬 상태의 구분 기준',
        'Redux vs Zustand 등 라이브러리 선택 기준',
        '서버 상태 관리(React Query)와의 구분',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          'useState와 useReducer의 차이점을 명확히 이해하고 계십니다.',
          '실무 경험을 바탕으로 구체적인 사용 사례를 제시하셨습니다.',
        ],
        improvements: [
          '성능 최적화 관점에서의 선택 기준을 추가하면 더 좋습니다.',
          '복잡한 상태 로직의 테스트 용이성에 대해서도 언급하면 좋겠습니다.',
        ],
        tip: 'useReducer를 사용할 때의 장점을 코드 가독성, 테스트 용이성, 상태 업데이트 예측 가능성 측면에서 구조화하여 설명하면 더욱 설득력 있는 답변이 됩니다.',
      },
    },
    {
      question: '최근 진행한 프로젝트에서 가장 기술적으로 도전적이었던 부분은 무엇이었나요?',
      followUp: '그 문제를 해결하는 과정에서 팀원들과 어떻게 협업하셨나요?',
      expectedKeyPoints: [
        '구체적인 기술적 문제 상황 설명',
        '문제 해결을 위한 접근 방법과 과정',
        '시행착오에서 배운 점',
        '최종 결과와 정량적 성과',
      ],
      followUpExpectedKeyPoints: [
        '팀원 간 역할 분담과 소통 방식',
        '의견 충돌 시 조율 과정',
        '협업 도구나 프로세스 활용',
        '팀 생산성 향상에 기여한 점',
      ],
      sampleFeedback: {
        score: 8,
        strengths: [
          '문제 상황을 구조화하여 명확하게 설명하셨습니다.',
          '해결 과정에서의 시행착오와 학습 내용을 잘 정리하셨습니다.',
        ],
        improvements: [
          '기술적 의사결정의 트레이드오프를 더 구체적으로 설명하면 좋겠습니다.',
          '결과의 정량적 지표(성능 개선율 등)를 추가하면 더욱 설득력이 있습니다.',
        ],
        tip: 'STAR 기법(Situation-Task-Action-Result)을 활용하여 답변을 구조화하면 더욱 체계적인 답변이 가능합니다.',
      },
    },
    {
      question: '팀 내에서 기술적 의견 충돌이 있을 때 어떻게 해결하시나요?',
      followUp: '의견 충돌 후에 팀의 기술 문화를 개선하기 위해 어떤 노력을 하셨나요?',
      expectedKeyPoints: [
        '데이터와 근거 기반 의사결정',
        '상대방 의견 존중과 경청',
        '구체적인 갈등 해결 사례',
        '기술 부채 관리 관점',
      ],
      followUpExpectedKeyPoints: [
        '코드 리뷰 프로세스 도입/개선',
        '기술 공유 문화 형성 노력',
        'POC를 통한 의사결정 방식',
        '팀 기술 역량 향상 활동',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '데이터와 근거를 바탕으로 의사결정하는 태도가 좋습니다.',
          '팀워크와 커뮤니케이션의 중요성을 잘 이해하고 계십니다.',
        ],
        improvements: [
          '구체적인 갈등 해결 사례를 추가하면 더 설득력이 있습니다.',
          '기술 부채 관리 관점에서의 의사결정 과정도 언급하면 좋겠습니다.',
        ],
        tip: '기술적 의견 충돌 시에는 POC(Proof of Concept)를 통해 실제로 비교해보는 접근법을 제안하면 좋습니다.',
      },
    },
  ],
  marketer: [
    {
      question: '퍼포먼스 마케팅에서 ROAS를 개선하기 위해 어떤 전략을 사용하시나요?',
      followUp: 'ROAS가 낮은 캠페인을 중단하는 기준은 무엇인가요?',
      expectedKeyPoints: [
        '타겟 오디언스 세분화와 최적화',
        '채널별 예산 배분 전략',
        'A/B 테스트를 통한 크리에이티브 최적화',
        '데이터 기반 의사결정 프로세스',
      ],
      followUpExpectedKeyPoints: [
        'ROAS 임계값 설정 방법',
        '손익분기점 분석',
        '테스트 기간과 통계적 유의성',
        '채널/세그먼트별 차별화된 기준',
      ],
      sampleFeedback: {
        score: 8,
        strengths: [
          '데이터 기반의 체계적인 접근 방식을 보여주셨습니다.',
          '다양한 최적화 전략을 실무 경험을 바탕으로 설명하셨습니다.',
        ],
        improvements: [
          '각 채널별 특성에 따른 전략 차이를 추가하면 좋겠습니다.',
          '장기적 브랜드 가치와 단기 ROAS의 균형에 대해 언급하면 더 좋습니다.',
        ],
        tip: '세그먼트별 ROAS 분석과 리타겟팅 전략을 연결하여 설명하면 더욱 전문적인 답변이 됩니다.',
      },
    },
    {
      question: '예산이 제한된 상황에서 신규 서비스의 인지도를 높이기 위한 마케팅 전략을 제안해주세요.',
      followUp: '그 전략의 성과를 어떻게 측정하시겠습니까?',
      expectedKeyPoints: [
        '타겟 고객 정의와 집중 전략',
        '오가닉/바이럴 채널 활용',
        'ROI 높은 채널 우선 투자',
        '단계별 실행 로드맵',
      ],
      followUpExpectedKeyPoints: [
        '핵심 KPI 설정 방법',
        '어트리뷰션 모델 선택',
        'CAC와 LTV 분석',
        '데이터 수집 인프라 구축',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '제한된 리소스를 효율적으로 활용하는 창의적 접근법을 제시하셨습니다.',
          '오가닉 채널과 페이드 채널의 균형을 잘 이해하고 계십니다.',
        ],
        improvements: [
          '각 전략의 우선순위와 실행 순서를 명확히 하면 좋겠습니다.',
          '타겟 고객 세분화와 메시지 차별화에 대해 더 구체적으로 설명하면 좋습니다.',
        ],
        tip: '그로스 해킹 사례를 참고하여 바이럴 루프와 추천 프로그램을 활용한 전략을 추가하면 더욱 설득력이 있습니다.',
      },
    },
    {
      question: '마케팅 캠페인의 성과가 기대에 미치지 못했을 때 어떻게 대응하시나요?',
      followUp: '실패한 캠페인에서 얻은 인사이트를 다음 캠페인에 어떻게 반영하시나요?',
      expectedKeyPoints: [
        '빠른 데이터 분석과 원인 진단',
        '가설 수립과 검증 프로세스',
        'A/B 테스트 기반 개선',
        '이해관계자 커뮤니케이션',
      ],
      followUpExpectedKeyPoints: [
        '체계적인 사후 분석(Post-mortem)',
        '실패 원인의 문서화',
        '개선 사항의 다음 캠페인 적용',
        '팀 학습 문화 형성',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '데이터 분석을 통한 체계적인 문제 진단 과정을 설명하셨습니다.',
          '빠른 피봇과 개선의 중요성을 잘 이해하고 계십니다.',
        ],
        improvements: [
          'A/B 테스트와 같은 구체적인 검증 방법을 추가하면 좋겠습니다.',
          '실패를 팀 학습 기회로 전환하는 과정을 더 자세히 설명하면 좋습니다.',
        ],
        tip: '캠페인 사후 분석 프레임워크(Post-mortem)를 활용하여 체계적으로 인사이트를 도출하고 문서화하는 프로세스를 설명하면 좋습니다.',
      },
    },
  ],
  designer: [
    {
      question: '사용자 리서치 결과와 비즈니스 요구사항이 충돌할 때 어떻게 접근하시나요?',
      followUp: '그런 상황에서 이해관계자를 설득하기 위해 어떤 방법을 사용하시나요?',
      expectedKeyPoints: [
        '사용자 데이터와 비즈니스 목표의 균형점 찾기',
        '정량적/정성적 근거를 통한 설득',
        '단기 타협과 장기 로드맵 제시',
        '이해관계자 설득 프로세스',
      ],
      followUpExpectedKeyPoints: [
        '프로토타입을 활용한 시각적 설득',
        'A/B 테스트 결과 활용',
        '비즈니스 임팩트 정량화',
        '점진적 개선 제안',
      ],
      sampleFeedback: {
        score: 8,
        strengths: [
          '사용자 경험과 비즈니스 목표의 균형을 잘 이해하고 계십니다.',
          '데이터 기반의 설득 방법을 제시하셨습니다.',
        ],
        improvements: [
          '구체적인 충돌 사례와 해결 과정을 추가하면 더 설득력이 있습니다.',
          '단기적 타협과 장기적 개선 로드맵을 함께 제시하면 좋겠습니다.',
        ],
        tip: '프로토타입과 사용자 테스트 결과를 활용하여 정량적 근거를 제시하면 이해관계자 설득이 더 쉬워집니다.',
      },
    },
    {
      question: '디자인 시스템을 구축하거나 개선한 경험이 있다면 말씀해주세요.',
      followUp: '디자인 시스템 도입 후 팀의 협업 방식이 어떻게 변화했나요?',
      expectedKeyPoints: [
        '컴포넌트 설계 원칙과 구조',
        '디자인 토큰과 스타일 가이드',
        '접근성 가이드라인 반영',
        '팀 내 채택과 확산 전략',
      ],
      followUpExpectedKeyPoints: [
        '디자인-개발 핸드오프 프로세스',
        '일관성 있는 UI 제작 효율화',
        '디자인 리뷰 프로세스',
        '컴포넌트 재사용률 향상',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '디자인 시스템의 필요성과 효과를 명확히 설명하셨습니다.',
          '구현 과정에서의 도전과제를 잘 정리하셨습니다.',
        ],
        improvements: [
          '컴포넌트 설계 원칙과 확장성에 대해 더 구체적으로 설명하면 좋겠습니다.',
          '디자인-개발 협업 프로세스 개선 사항을 추가하면 더 좋습니다.',
        ],
        tip: '디자인 토큰, 접근성 가이드라인, 반응형 설계 원칙 등 체계적인 시스템 구성 요소를 언급하면 전문성이 더욱 돋보입니다.',
      },
    },
    {
      question: '디자인 결정에 대해 개발팀과 의견이 다를 때 어떻게 소통하시나요?',
      followUp: '기술적 제약으로 인해 디자인을 수정해야 할 때는 어떻게 대응하시나요?',
      expectedKeyPoints: [
        '기술적 제약 이해를 위한 노력',
        '디자인 의도의 명확한 전달',
        '구체적인 소통 사례',
        '정기적인 싱크업 미팅',
      ],
      followUpExpectedKeyPoints: [
        '디자인 대안 제시 과정',
        '기술적 타협의 기준',
        '사용자 경험 품질 유지 방법',
        '개발자와의 공동 문제 해결',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '개발팀과의 협업과 소통의 중요성을 잘 이해하고 계십니다.',
          '디자인 의도를 명확히 전달하는 방법을 알고 계십니다.',
        ],
        improvements: [
          '기술적 이해도를 높이기 위한 노력을 구체적으로 설명하면 좋겠습니다.',
          '디자인과 개발 간 트레이드오프를 협의하는 프로세스를 추가하면 좋습니다.',
        ],
        tip: 'Figma의 개발자 핸드오프 기능이나 디자인 스펙 문서화를 통해 오해를 줄이고, 정기적인 디자인-개발 싱크업을 제안하면 좋습니다.',
      },
    },
  ],
  pm: [
    {
      question: '새로운 기능의 우선순위를 어떤 기준으로 결정하시나요?',
      followUp: '우선순위가 낮아진 기능에 대해 이해관계자들과 어떻게 커뮤니케이션 하시나요?',
      expectedKeyPoints: [
        'RICE/ICE 등 정량적 프레임워크 활용',
        '사용자 가치와 비즈니스 임팩트 균형',
        '데이터 기반 의사결정',
        '이해관계자 합의 도출',
      ],
      followUpExpectedKeyPoints: [
        '투명한 의사결정 과정 공유',
        '대안 제시와 논리적 설명',
        '로드맵 시각화와 공유',
        '정기적인 업데이트 제공',
      ],
      sampleFeedback: {
        score: 8,
        strengths: [
          '체계적인 우선순위 결정 프레임워크를 사용하고 계십니다.',
          '데이터와 사용자 가치를 기반으로 판단하는 접근법이 좋습니다.',
        ],
        improvements: [
          '기술 부채와 리팩토링의 우선순위 결정 기준도 추가하면 좋겠습니다.',
          '이해관계자 간 우선순위 충돌 시 조율 방법을 더 구체적으로 설명하면 좋습니다.',
        ],
        tip: 'RICE 스코어링(Reach, Impact, Confidence, Effort)과 같은 정량적 프레임워크를 활용하면 우선순위 결정의 투명성을 높일 수 있습니다.',
      },
    },
    {
      question: '출시한 제품의 핵심 지표가 예상보다 낮을 때 어떤 순서로 문제를 분석하시나요?',
      followUp: '분석 결과를 바탕으로 어떻게 개선 계획을 수립하시나요?',
      expectedKeyPoints: [
        '퍼널 단계별 분석',
        '코호트/세그먼트 분석',
        '정성적 데이터(사용자 인터뷰) 병행',
        '가설 수립과 우선순위화',
      ],
      followUpExpectedKeyPoints: [
        '가설 기반 A/B 테스트 설계',
        '빠른 실험과 반복',
        'OKR/KPI 연동',
        '팀 리소스와 일정 관리',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '데이터 기반의 체계적인 문제 분석 접근법을 보여주셨습니다.',
          '정성적, 정량적 데이터를 함께 활용하는 균형 잡힌 시각을 가지고 계십니다.',
        ],
        improvements: [
          '퍼널 분석과 코호트 분석 등 구체적인 분석 방법을 추가하면 좋겠습니다.',
          '가설 수립과 검증 프로세스를 더 명확히 하면 좋습니다.',
        ],
        tip: '문제 진단 시 사용자 세그먼트별로 지표를 분해하고, A/B 테스트를 통해 개선 방향을 검증하는 과정을 설명하면 더욱 전문적입니다.',
      },
    },
    {
      question: '개발 리소스가 부족한 상황에서 이해관계자의 요구를 어떻게 조율하시나요?',
      followUp: '리소스 제약 속에서도 핵심 가치를 전달하기 위한 전략은 무엇인가요?',
      expectedKeyPoints: [
        'MVP 정의와 스코프 관리',
        '이해관계자 기대치 관리',
        'MoSCoW 우선순위 기법',
        '기술 부채와의 균형',
      ],
      followUpExpectedKeyPoints: [
        '핵심 사용자 여정 집중',
        '단계별 출시 전략',
        '빠른 검증과 피봇',
        '비기능 요구사항 최소화',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '제약 조건 내에서의 우선순위 관리 능력을 보여주셨습니다.',
          '이해관계자 커뮤니케이션의 중요성을 잘 이해하고 계십니다.',
        ],
        improvements: [
          'MVP 정의와 단계별 출시 전략을 더 구체적으로 설명하면 좋겠습니다.',
          '기술 부채 관리와의 균형에 대해서도 언급하면 좋습니다.',
        ],
        tip: 'MoSCoW 우선순위(Must/Should/Could/Won\'t) 기법을 활용하여 이해관계자와 명확한 합의를 만드는 과정을 설명하면 좋습니다.',
      },
    },
  ],
  general: [
    {
      question: '자기소개를 간단히 해주시고, 이 직무에 지원한 이유를 말씀해주세요.',
      followUp: '본인의 강점이 이 직무에서 어떻게 발휘될 수 있다고 생각하시나요?',
      expectedKeyPoints: [
        '경험과 직무의 연관성',
        '구체적인 지원 동기',
        '차별화된 강점',
        '회사/직무 리서치 반영',
      ],
      followUpExpectedKeyPoints: [
        '강점의 구체적 사례',
        '직무 요구사항과의 매칭',
        '성과를 낸 경험',
        '성장 가능성 제시',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '본인의 경험과 직무의 연관성을 명확히 설명하셨습니다.',
          '지원 동기가 구체적이고 진정성이 느껴집니다.',
        ],
        improvements: [
          '본인의 차별화된 강점을 더 부각하면 좋겠습니다.',
          '회사와 직무에 대한 리서치 내용을 추가하면 더욱 설득력이 있습니다.',
        ],
        tip: '지원 회사의 가치관과 본인의 가치관이 어떻게 일치하는지 연결하여 설명하면 더욱 인상적인 자기소개가 됩니다.',
      },
    },
    {
      question: '업무 중 예상치 못한 문제가 발생했을 때 어떻게 대처하시나요?',
      followUp: '그런 경험에서 가장 중요하게 배운 점은 무엇인가요?',
      expectedKeyPoints: [
        '침착한 상황 분석',
        '우선순위 기반 대처',
        '구체적인 문제 해결 사례',
        '팀원/상사와의 소통',
      ],
      followUpExpectedKeyPoints: [
        '실패에서 얻은 교훈',
        '재발 방지를 위한 노력',
        '성장 마인드셋',
        '프로세스 개선 제안',
      ],
      sampleFeedback: {
        score: 8,
        strengths: [
          '문제 해결 과정을 체계적으로 설명하셨습니다.',
          '구체적인 사례를 들어 설득력 있게 답변하셨습니다.',
        ],
        improvements: [
          '문제 예방을 위한 사전 대비 노력도 추가하면 좋겠습니다.',
          '팀원들과의 협업 과정을 더 자세히 설명하면 좋습니다.',
        ],
        tip: '위기 상황에서의 우선순위 설정과 커뮤니케이션 방법을 함께 설명하면 리더십 역량도 어필할 수 있습니다.',
      },
    },
    {
      question: '팀워크에서 가장 중요하다고 생각하는 것은 무엇인가요?',
      followUp: '팀 내에서 갈등이 발생했을 때 어떤 역할을 하시나요?',
      expectedKeyPoints: [
        '소통과 신뢰의 중요성',
        '구체적인 팀 협업 사례',
        '다양한 의견 존중',
        '팀 목표 달성 경험',
      ],
      followUpExpectedKeyPoints: [
        '갈등 원인 파악과 중재',
        '건설적인 피드백 방법',
        '팀 분위기 개선 노력',
        '심리적 안전감 조성',
      ],
      sampleFeedback: {
        score: 7,
        strengths: [
          '팀워크의 핵심 요소를 잘 이해하고 계십니다.',
          '실제 경험을 바탕으로 답변하셔서 진정성이 느껴집니다.',
        ],
        improvements: [
          '다양한 성향의 팀원들과 협업한 경험을 추가하면 좋겠습니다.',
          '본인이 팀에 기여한 구체적인 성과를 언급하면 더 좋습니다.',
        ],
        tip: '팀의 심리적 안전감 조성과 건설적인 피드백 문화 형성에 기여한 경험을 함께 설명하면 좋습니다.',
      },
    },
  ],
};

export const DEMO_INTRO: Record<string, string> = {
  developer: '안녕하세요, 기술 면접을 시작하겠습니다. 편하게 답변해주세요.',
  marketer: '안녕하세요, 마케팅 직무 면접을 시작하겠습니다. 편하게 답변해주세요.',
  designer: '안녕하세요, 디자인 직무 면접을 시작하겠습니다. 편하게 답변해주세요.',
  pm: '안녕하세요, PM 직무 면접을 시작하겠습니다. 편하게 답변해주세요.',
  general: '안녕하세요, 면접을 시작하겠습니다. 편하게 답변해주세요.',
};

export const JOB_FUNCTION_LABELS: Record<string, string> = {
  developer: '개발',
  marketer: '마케팅',
  designer: '디자인',
  pm: '기획/PM',
  general: '일반',
};

export function generateInsufficientFeedback(
  question: DemoQuestion,
  isFollowUp: boolean
): DemoQuestion['sampleFeedback'] {
  const keyPoints = isFollowUp
    ? question.followUpExpectedKeyPoints
    : question.expectedKeyPoints;

  return {
    score: 2,
    strengths: [],
    improvements: [
      '질문에 대한 구체적인 답변이 필요합니다.',
      `이 질문에서는 다음과 같은 내용을 다루면 좋습니다: ${keyPoints.slice(0, 2).join(', ')}`,
    ],
    tip: `${keyPoints[0]}에 대해 자신의 경험이나 이해를 바탕으로 설명해보세요. 완벽하지 않아도 괜찮으니, 알고 있는 부분부터 차근차근 답변해보세요.`,
  };
}
