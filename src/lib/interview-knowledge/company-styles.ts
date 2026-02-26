import type { CompanyInterviewStyle } from './types';

/**
 * MVP Company Interview Style Profiles
 * Phase 8a.3 - Korean Tech Company Interview Patterns
 */
export const COMPANY_STYLES: CompanyInterviewStyle[] = [
  {
    companyId: 'naver',
    displayName: '네이버 (Naver)',
    description:
      '한국 최대 IT 기업으로 대규모 트래픽 처리와 검색 기술에 강점. 실제 서비스 맥락을 활용한 시나리오 기반 질문과 트레이드오프 분석을 중시합니다.',
    interviewStructure: {
      rounds: ['코딩 테스트', '기술 면접 1차 (심화)', '기술 면접 2차 (시스템 설계)', '리더십/컬처핏'],
      focusAreas: ['대용량 데이터 처리', '시스템 설계', '알고리즘 최적화', '검색/추천 시스템'],
      timePerRound: '기술 면접 각 60-90분',
    },
    questionStyle: {
      emphasis: [
        '대규모 트래픽 처리 (수억 PV 단위)',
        '트레이드오프 분석 및 의사결정 과정',
        '장애 대응 및 postmortem 경험',
        '실제 네이버 서비스를 예시로 활용 ("네이버 검색에서...", "네이버 쇼핑에서...")',
        '성능 최적화 및 모니터링 경험',
      ],
      avoidTopics: ['너무 이론적인 알고리즘 문제', '스타트업 규모의 작은 시스템', '해외 기업 특화 기술 (AWS 독점 등)'],
      styleGuide:
        '네이버의 실제 서비스 상황을 가정하여 질문하세요. "네이버 뉴스 피드에서 일일 1억 PV를 처리한다면..." 같은 구체적인 맥락을 제시하고, 후보자가 트레이드오프를 어떻게 분석하고 의사결정하는지 깊이 파고드세요. 단순히 정답을 찾는 것이 아니라, 대안 비교, 장단점 분석, 실제 운영 시 고려사항 등을 논리적으로 설명할 수 있는지 평가합니다. 장애 상황이나 성능 개선 사례를 물어볼 때는 구체적인 수치(QPS, latency, throughput 등)를 요구하세요.',
      exampleQuestions: [
        '네이버 뉴스에서 일일 1억 PV를 처리하는 피드 시스템을 설계한다면, 어떤 아키텍처를 선택하시겠습니까? 캐싱 전략과 DB 샤딩 방안을 포함해 설명해주세요.',
        '네이버 검색 자동완성 기능에서 실시간성과 정확도 중 무엇을 우선하시겠습니까? 각 선택의 트레이드오프를 설명해주세요.',
        '수백만 건의 데이터를 담은 MySQL DB를 무중단으로 PostgreSQL로 마이그레이션해야 합니다. 어떤 전략을 사용하시겠습니까?',
        '네이버 쇼핑 상품 검색에서 검색 결과가 5초 이상 걸리는 장애가 발생했습니다. 원인을 찾고 해결하는 과정을 설명해주세요.',
        '네이버 메일 서비스에서 스팸 필터링 시스템을 개선해야 합니다. 어떤 접근 방법을 사용하시겠습니까? (ML vs 룰 베이스, 실시간 vs 배치 등)',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        '대규모 시스템 설계 및 운영 경험',
        '논리적 문제 해결 능력',
        '트레이드오프를 명확히 인식하고 의사결정하는 능력',
        '성능 최적화 및 모니터링 실무 경험',
      ],
      redFlags: [
        '규모에 대한 감각 부족 (소규모 시스템만 경험)',
        '트레이드오프 분석 없이 단순 답변',
        '장애 대응 경험 부족',
        '성능 수치를 구체적으로 설명하지 못함',
      ],
      greenFlags: [
        '대용량 트래픽 경험을 구체적 수치와 함께 설명',
        '여러 대안을 비교 분석하고 선택 이유를 명확히 제시',
        '실제 장애 대응 경험과 postmortem 공유',
        '캐싱, DB 최적화, 분산 시스템 등 실무 적용 경험',
      ],
    },
    culture: {
      values: ['기술 혁신', '사용자 중심', '대규모 시스템 안정성', '데이터 기반 의사결정'],
      teamStructure: '대규모 조직, 서비스별 팀 구조, 백엔드/프론트엔드/데이터/인프라 등 역할 명확히 분리',
      techStack: ['Java/Spring', 'Node.js', 'React/Vue', 'Kubernetes', 'Hadoop/Spark', 'MySQL/Redis', 'Kafka'],
    },
  },
  {
    companyId: 'coupang',
    displayName: '쿠팡 (Coupang)',
    description:
      'Amazon 스타일 Leadership Principles 기반 면접을 진행하는 한국 최대 이커머스 기업. 대규모 주문/재고/물류 시스템 경험과 LP 기반 행동 면접을 중시합니다.',
    interviewStructure: {
      rounds: ['온라인 코딩 테스트 (OA)', 'Phone Screen', '온사이트 (4-5 라운드)', 'Bar Raiser'],
      focusAreas: ['시스템 설계 (주문/재고/물류)', '코딩 능력', 'OOP 설계', 'Leadership Principles'],
      timePerRound: '온사이트 각 라운드 45-60분',
    },
    questionStyle: {
      emphasis: [
        'Leadership Principles (Bias for Action, Dive Deep, Ownership 등)',
        'STAR 기법 (Situation, Task, Action, Result) 활용한 행동 질문',
        '대규모 이커머스 시스템 (주문 처리, 재고 관리, 배송 추적)',
        'SOLID 원칙 및 객체지향 설계',
        '데이터 기반 의사결정 경험',
      ],
      avoidTopics: ['너무 추상적인 이론 질문', '이커머스와 무관한 도메인', '한국 로컬 이슈 (글로벌 관점 중시)'],
      styleGuide:
        '쿠팡의 Leadership Principles를 중심으로 면접을 진행하세요. 각 질문은 특정 LP를 평가하도록 설계하고, 후보자가 STAR 기법으로 답변하도록 유도하세요. 예: "Bias for Action을 발휘했던 경험을 말씀해주세요. 불확실한 상황에서 빠르게 결정하고 실행했던 사례가 있나요?" 기술 질문에서도 LP를 연결하세요: "100만 건 동시 주문 시스템을 설계할 때 (Dive Deep) 어떤 데이터를 분석하셨나요? 어떤 메트릭으로 성공을 측정하셨나요?" 후보자가 구체적인 수치, 데이터, 결과를 제시하는지 확인하세요.',
      exampleQuestions: [
        '[LP - Bias for Action] 불확실한 상황에서 빠르게 의사결정하고 실행했던 경험을 STAR 기법으로 설명해주세요. 어떤 리스크가 있었고, 어떻게 완화했나요?',
        '[시스템 설계] 쿠팡 로켓배송에서 100만 건의 동시 주문을 처리하는 시스템을 설계해주세요. 주문 생성부터 재고 차감, 결제, 배송 할당까지의 플로우를 설명하세요.',
        '[LP - Dive Deep] 복잡한 기술 문제를 깊이 파고들어 해결했던 경험이 있나요? 어떤 데이터를 수집하고 분석했나요?',
        '[LP - Ownership] 본인 담당이 아닌 영역의 문제를 발견하고 해결했던 경험을 말씀해주세요. 왜 그 문제를 본인이 해결하기로 결정했나요?',
        '[OOP 설계] 쿠팡 상품 할인 정책 시스템을 설계해주세요. (정률 할인, 정액 할인, N+1 이벤트 등) SOLID 원칙을 어떻게 적용하시겠습니까?',
        '[데이터 기반 의사결정] 기술 스택을 선택할 때 데이터를 어떻게 활용하셨나요? A/B 테스트나 성능 벤치마크 경험이 있나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        'Leadership Principles 체화 정도 (특히 Bias for Action, Dive Deep, Ownership)',
        '대규모 이커머스 시스템 설계 능력',
        'STAR 기법으로 구체적 경험을 설명하는 능력',
        '데이터 기반 의사결정 및 메트릭 추적 경험',
      ],
      redFlags: [
        'LP 질문에 추상적이거나 이론적으로만 답변',
        '구체적 수치나 데이터 없이 모호하게 답변',
        '본인 역할과 기여를 명확히 구분하지 못함 (we vs I)',
        '실패 경험이나 배운 점을 공유하지 않음',
      ],
      greenFlags: [
        'LP를 실제 경험과 연결하여 STAR 기법으로 설명',
        '구체적 수치와 결과를 제시 (예: "배포 시간을 30분에서 5분으로 단축")',
        '실패 경험과 거기서 배운 점을 솔직히 공유',
        '데이터 기반으로 의사결정하고 결과를 측정한 경험',
        '본인 역할을 명확히 구분 ("제가 직접 ~했습니다")',
      ],
    },
    culture: {
      values: ['고객 집착', '빠른 실행', '주인의식', '깊이 파고들기', '최고 인재 채용'],
      teamStructure: 'Amazon 스타일 2-pizza 팀, 풀스택 지향, 서비스별 독립적 팀 운영 (마이크로서비스)',
      techStack: ['Java/Spring Boot', 'React', 'AWS (EC2, S3, RDS, Lambda 등)', 'Kafka', 'DynamoDB', 'Redis'],
    },
  },
  {
    companyId: 'kakao',
    displayName: '카카오 (Kakao)',
    description:
      '메신저 기반 다양한 서비스를 운영하는 IT 플랫폼 기업. 알고리즘적 사고력을 확인한 후 실무 시나리오로 전환하며, 카카오톡 기반 서비스 맥락을 활용한 질문을 중시합니다.',
    interviewStructure: {
      rounds: ['코딩 테스트 (카카오 블라인드)', '기술 면접', '컬처핏 면접'],
      focusAreas: ['알고리즘', '시스템 설계', '서비스 이해도', '협업 능력'],
      timePerRound: '기술 면접 60분, 컬처핏 30-45분',
    },
    questionStyle: {
      emphasis: [
        '알고리즘 문제 해결 과정 및 사고력',
        '카카오톡 기반 서비스 확장 시나리오 ("카카오톡에서...", "카카오페이에서...")',
        '사용자 경험 관점에서의 기술 선택',
        '팀 내 의견 충돌 시 해결 방법',
      ],
      avoidTopics: [
        '카카오 서비스와 무관한 도메인',
        '너무 추상적인 알고리즘 이론',
        '해외 기업 특화 문화 (LP 등)',
      ],
      styleGuide:
        '카카오 면접은 알고리즘 사고력을 먼저 확인한 후 실무 맥락으로 연결합니다. "카카오톡 오픈채팅에서 실시간 메시지 검색 기능을 만든다면..."처럼 실제 서비스 상황을 가정하여 질문하세요. 후보자가 기술적 제약과 사용자 경험을 모두 고려하는지 평가합니다. 협업 경험을 물어볼 때는 "팀원과 기술적 의견이 달랐을 때 어떻게 설득했나요?" 같이 구체적인 상황을 요구하세요.',
      exampleQuestions: [
        '[알고리즘 + 서비스] 카카오톡 오픈채팅에서 수백만 메시지 중 특정 키워드를 실시간으로 검색하는 기능을 구현한다면 어떤 자료구조와 알고리즘을 사용하시겠습니까?',
        '[시스템 설계] 카카오페이에서 수천만 사용자에게 동시에 푸시 알림을 보내는 시스템을 설계해주세요. 어떤 아키텍처를 사용하시겠습니까?',
        '[협업 경험] 팀 내에서 기술적 의견이 충돌했던 경험이 있나요? 어떻게 상대방을 설득하거나 합의점을 찾았나요?',
        '[사용자 경험] 카카오톡 메시지 전송 속도와 안정성 중 하나를 선택해야 한다면 어떤 기준으로 결정하시겠습니까? 사용자 경험 관점에서 설명해주세요.',
        '[서비스 이해] 카카오 서비스 중 하나를 선택해서, 개선하고 싶은 기능과 그 이유를 기술적 관점에서 설명해주세요.',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        '알고리즘 문제 해결 능력',
        '카카오 서비스에 대한 이해와 관심',
        '사용자 중심 사고',
        '협업 및 커뮤니케이션 능력',
      ],
      redFlags: [
        '알고리즘을 외워서만 푸는 경우',
        '카카오 서비스에 대한 관심이나 이해 부족',
        '기술 중심으로만 생각하고 사용자 경험 무시',
        '협업 경험에서 일방적 태도',
      ],
      greenFlags: [
        '알고리즘 문제를 논리적으로 분해하고 접근',
        '카카오 서비스를 실제로 사용하며 개선점을 고민한 경험',
        '기술 선택 시 사용자 경험을 함께 고려',
        '팀 내 의견 조율 경험을 구체적으로 설명',
      ],
    },
    culture: {
      values: ['사용자 중심', '기술 혁신', '협업과 소통', '빠른 실행'],
      teamStructure: '서비스별 팀 구조, 크루(Crew) 단위 자율적 운영, 백엔드/프론트/안드로이드/iOS 등 역할 구분',
      techStack: ['Kotlin/Spring', 'React', 'Node.js', 'Kafka', 'Kubernetes', 'Redis', 'MySQL'],
    },
  },
  {
    companyId: 'toss',
    displayName: '토스 (Toss/비바리퍼블리카)',
    description:
      '핀테크 유니콘, 빠른 프로덕트 사이클과 사일로 조직 구조. "왜?"를 계속 파고들며 기술 선택 근거를 확인하고, 금융 서비스의 제약사항(정합성, 보안, 규제)을 함께 고려합니다.',
    interviewStructure: {
      rounds: ['코딩 테스트', '1차 기술 면접', '2차 기술 면접 (팀 리드)', '컬처핏'],
      focusAreas: ['프로덕트 사고', '금융 도메인 이해', '빠른 실행력', '코드 품질'],
      timePerRound: '기술 면접 각 60분',
    },
    questionStyle: {
      emphasis: [
        '프로덕트 관점에서의 기술 결정 ("왜 이 기술을 선택했나요?")',
        '금융 서비스 안정성 및 보안 (idempotency, 정합성, 규제 준수)',
        '빠른 실험과 배포 경험',
        'UX를 위한 기술 트레이드오프',
      ],
      avoidTopics: [
        '금융 도메인과 무관한 주제',
        '너무 이론적인 알고리즘',
        '대기업 특화 프로세스 (느린 의사결정)',
      ],
      styleGuide:
        '토스 면접은 "왜?"를 계속 파고듭니다. "이 기술을 선택한 이유는?", "다른 대안은 없었나요?", "트레이드오프는 무엇인가요?"처럼 기술 선택의 근거를 깊이 탐구하세요. 금융 서비스 특성상 송금 idempotency 보장, 데이터 정합성, 보안 규제 준수 등을 질문에 포함하세요. "2주 안에 금융 상품 기능을 출시해야 한다면 어떤 기술적 타협을 하시겠습니까?" 같이 빠른 실행과 품질의 균형을 평가합니다.',
      exampleQuestions: [
        '[금융 도메인] 송금 API에서 idempotency를 어떻게 보장하시겠습니까? 중복 요청 시 어떻게 처리하시겠습니까?',
        '[프로덕트 사고] 2주 내에 새로운 금융 상품 기능을 출시해야 합니다. 완벽한 구현과 빠른 출시 사이에서 어떤 기술적 타협을 하시겠습니까?',
        '[사용자 경험] 토스 앱에서 송금이 1초 이상 걸리면 사용자 이탈률이 높아집니다. 어떻게 응답 속도를 개선하시겠습니까? (정합성은 유지하면서)',
        '[기술 선택] 본인이 선택한 기술 스택 중 하나를 골라, 왜 그 기술을 선택했고 다른 대안과 비교했을 때 어떤 트레이드오프가 있었는지 설명해주세요.',
        '[임팩트 경험] 본인이 만든 기능이 실제 사용자 리텐션이나 매출에 기여한 경험이 있나요? 어떻게 측정했나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        '프로덕트 관점의 기술 결정 능력',
        '금융 서비스 안정성 및 보안 이해',
        '빠른 실행과 품질의 균형',
        '사용자 임팩트 지향',
      ],
      redFlags: [
        '기술 선택의 근거를 명확히 설명하지 못함',
        '금융 도메인 특성(정합성, 보안)을 고려하지 않음',
        '완벽주의로 인한 느린 실행',
        '사용자 임팩트보다 기술 자체에만 집중',
      ],
      greenFlags: [
        '기술 선택 시 여러 대안을 비교하고 트레이드오프 설명',
        '금융 서비스 안정성/보안 요구사항 이해',
        '빠른 실험과 배포 경험 (A/B 테스트, feature flag 등)',
        'UX 개선을 위한 기술적 노력 사례',
        '사용자 임팩트를 측정하고 개선한 경험',
      ],
    },
    culture: {
      values: ['프로덕트 중심', '빠른 실행', '사용자 임팩트', '투명성', '자율과 책임'],
      teamStructure: '사일로 조직 (독립적 팀), 프로덕트 단위 풀스택 팀, 빠른 의사결정',
      techStack: ['Kotlin/Spring', 'React', 'Next.js', 'Kafka', 'AWS', 'PostgreSQL', 'Redis'],
    },
  },
  {
    companyId: 'line',
    displayName: 'LINE (라인플러스)',
    description:
      '글로벌 메신저 서비스, 일본 시장 중심의 분산 시스템 운영. 글로벌 서비스 관점에서 다국어/다문화, 일본-한국 간 데이터 동기화 시나리오를 중시합니다.',
    interviewStructure: {
      rounds: ['코딩 테스트', '기술 면접 1차', '기술 면접 2차 (설계)', '매니저 면접'],
      focusAreas: ['분산 시스템', '대규모 메시징', '글로벌 서비스', '멀티 리전'],
      timePerRound: '기술 면접 각 60-90분',
    },
    questionStyle: {
      emphasis: [
        'CAP 정리의 실무 적용 (일관성 vs 가용성)',
        '멀티 리전 아키텍처 (한국-일본 데이터센터)',
        '글로벌 서비스 지연 시간 최적화',
        '대규모 메시징 시스템 안정성',
      ],
      avoidTopics: [
        '단일 리전 시스템',
        '소규모 서비스 시나리오',
        '한국 로컬 이슈만 고려',
      ],
      styleGuide:
        'LINE 면접은 글로벌 서비스 관점을 중시합니다. "한국과 일본 데이터센터 간 메시지를 동기화한다면..."처럼 멀티 리전 시나리오를 활용하세요. CAP 정리를 실무에 어떻게 적용하는지, Eventually Consistent 상황에서 UX를 어떻게 설계하는지 평가합니다. "수억 명이 동시에 메시지를 읽는 상황에서 읽음 확인을 어떻게 처리하시겠습니까?"처럼 대규모 시스템 질문을 하세요.',
      exampleQuestions: [
        '[분산 시스템] LINE 메신저에서 한국과 일본 데이터센터 간 메시지 일관성을 어떻게 보장하시겠습니까? CAP 정리를 실무에 어떻게 적용하시겠습니까?',
        '[대규모 메시징] 수억 명의 사용자가 동시에 메시지를 보내는 상황에서 읽음 확인 시스템을 설계해주세요. 어떤 아키텍처를 사용하시겠습니까?',
        '[글로벌 서비스] 한국 사용자와 일본 사용자 간 메시지 전송 시 네트워크 지연이 발생합니다. 사용자 경험을 해치지 않으면서 어떻게 최적화하시겠습니까?',
        '[Eventually Consistent] 분산 시스템에서 데이터 일관성이 즉시 보장되지 않을 때, 사용자에게 어떤 UX를 제공하시겠습니까? 실제 경험이 있다면 공유해주세요.',
        '[멀티 리전] 여러 리전에 걸친 서비스를 운영할 때 가장 어려웠던 점은 무엇인가요? 어떻게 해결했나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        '분산 시스템 이해 및 경험',
        '글로벌 서비스 관점 (다국어, 멀티 리전)',
        'CAP 정리 실무 적용 능력',
        '대규모 메시징 시스템 경험',
      ],
      redFlags: [
        '분산 시스템에 대한 이해 부족',
        '단일 리전만 경험',
        'CAP 정리를 이론으로만 알고 실무 적용 못함',
        '글로벌 서비스 특성 (시차, 문화) 무시',
      ],
      greenFlags: [
        '멀티 리전 아키텍처 설계 및 운영 경험',
        'CAP 정리를 실무에 적용한 구체적 사례',
        'Eventually Consistent 상황에서 UX 설계 경험',
        '대규모 메시징/실시간 시스템 경험',
        '글로벌 서비스의 문화적/기술적 고려사항 이해',
      ],
    },
    culture: {
      values: ['글로벌 마인드셋', '기술 혁신', '사용자 중심', '안정성과 확장성'],
      teamStructure: '글로벌 조직 (한국-일본-대만), 서비스별 팀, 백엔드/프론트/인프라 역할 구분',
      techStack: ['Java/Spring', 'Kotlin', 'Armeria', 'Kafka', 'HBase', 'Redis', 'Kubernetes'],
    },
  },
  {
    companyId: 'samsung-sds',
    displayName: '삼성SDS (Samsung SDS)',
    description:
      '대기업 SI/솔루션 기업, 체계적 프로세스와 보안 중시. CS 기초를 탄탄히 확인하고, 알고리즘 사고력 평가, 대규모 SI 프로젝트 경험을 중요하게 봅니다.',
    interviewStructure: {
      rounds: ['GSAT/코딩 테스트', 'SW 역량 면접', '직무 면접', '임원 면접'],
      focusAreas: ['알고리즘', 'CS 기초', '프로젝트 관리', '보안'],
      timePerRound: 'SW 역량 면접 60분, 직무 면접 30-45분',
    },
    questionStyle: {
      emphasis: [
        'CS 기초 지식 (OS, 네트워크, DB, 자료구조)',
        '알고리즘 문제 해결 능력',
        '대규모 프로젝트 관리 및 협업 경험',
        '보안 및 컴플라이언스 고려',
      ],
      avoidTopics: [
        '너무 최신 기술 (검증되지 않은)',
        '스타트업 특화 주제 (빠른 실험, MVP)',
        '체계 없는 개발 방법론',
      ],
      styleGuide:
        '삼성SDS 면접은 CS 기초를 탄탄히 확인합니다. "TCP와 UDP의 차이와 각각 어떤 서비스에 적합한가요?"처럼 기본 개념을 정확히 이해하는지 평가하세요. 알고리즘 문제는 사고 과정을 중시하며, "100만 건의 데이터를 메모리 제약 하에 정렬하려면 어떤 알고리즘을 사용하시겠습니까?" 같이 실무 제약을 포함하세요. 대규모 프로젝트 경험을 물어볼 때는 "팀 프로젝트에서 일정이 지연되었을 때 어떻게 대응했나요?" 같이 협업과 프로세스를 평가합니다.',
      exampleQuestions: [
        '[CS 기초 - 네트워크] TCP와 UDP의 차이를 설명하고, 각각 어떤 서비스에 적합한지 예시와 함께 설명해주세요.',
        '[알고리즘] 메모리가 제한된 환경에서 100만 건의 데이터를 정렬해야 합니다. 어떤 알고리즘을 사용하시겠습니까? 시간/공간 복잡도와 함께 설명해주세요.',
        '[프로젝트 관리] 팀 프로젝트에서 일정이 지연되었던 경험이 있나요? 어떻게 대응했고, 결과는 어떠했나요?',
        '[보안] 웹 애플리케이션에서 SQL Injection 공격을 방어하려면 어떤 방법을 사용하시겠습니까? 다른 보안 취약점도 아는 대로 설명해주세요.',
        '[CS 기초 - OS] 프로세스와 스레드의 차이를 설명하고, 멀티스레드 환경에서 발생할 수 있는 문제와 해결 방법을 설명해주세요.',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        'CS 기초 지식의 정확한 이해',
        '알고리즘 문제 해결 능력',
        '체계적인 개발 방법론 이해',
        '보안 및 컴플라이언스 인식',
      ],
      redFlags: [
        'CS 기초 개념을 정확히 모름',
        '알고리즘 문제에 체계적으로 접근하지 못함',
        '대규모 프로젝트 경험 없이 소규모만 경험',
        '보안/컴플라이언스 무시',
      ],
      greenFlags: [
        'CS 기초를 정확히 이해하고 실무에 적용한 경험',
        '알고리즘 문제를 체계적으로 분해하고 풀이',
        '대규모 SI 프로젝트 경험 (일정 관리, 협업)',
        '보안/컴플라이언스를 고려한 개발 경험',
        '체계적 개발 방법론 (Agile, Waterfall) 이해 및 적용',
      ],
    },
    culture: {
      values: ['프로세스 준수', '보안 최우선', '고객 중심', '기술 혁신', '협업과 소통'],
      teamStructure: '대규모 조직, 프로젝트 단위 팀 구성, PM/PL/개발자/QA 역할 명확히 구분',
      techStack: ['Java/Spring', 'Samsung Cloud Platform', 'Oracle DB', 'Angular', 'Kubernetes', 'Jenkins'],
    },
  },
  {
    companyId: 'startup',
    displayName: '스타트업 (일반)',
    description:
      '한국 스타트업의 일반적인 면접 패턴. 실무 중심, 포트폴리오/프로젝트 중심, "빠르게 배우고 빠르게 만들 수 있는가"에 초점. 형식은 덜 격식적이고 팀 호환성을 중시합니다.',
    interviewStructure: {
      rounds: ['코딩 과제 (Take-home or Live)', '기술 면접', '컬처핏/팀 호환성 면접'],
      focusAreas: ['실무 프로젝트 경험', '빠른 학습 능력', '다양한 기술 스택 활용', '풀스택 역량'],
      timePerRound: '기술 면접 30-60분, 컬처핏 30분',
    },
    questionStyle: {
      emphasis: [
        '실제 구현한 프로젝트 경험 (포트폴리오, GitHub)',
        '새로운 기술을 빠르게 학습한 경험',
        '제한된 리소스로 문제를 해결한 경험',
        '코드 품질과 개발 속도의 균형',
        '스타트업 환경에 대한 이해 (불확실성, 빠른 변화)',
      ],
      avoidTopics: [
        '너무 이론적인 알고리즘 (LeetCode Hard 수준)',
        '대기업 특화 주제 (수억 PV, 수백 대 서버 등)',
        '너무 세분화된 역할 구분 (프론트만, 백엔드만)',
      ],
      styleGuide:
        '스타트업 면접은 실용성과 실행력에 초점을 맞추세요. "이전에 만드신 프로젝트 중 가장 자랑스러운 것은 무엇인가요? 왜 그 기술 스택을 선택했나요?"처럼 후보자의 실제 경험을 깊이 파고드세요. 포트폴리오나 GitHub 코드를 함께 보면서 "이 부분은 왜 이렇게 구현하셨나요? 다른 방법도 고려하셨나요?" 같은 질문으로 사고 과정을 평가하세요. 스타트업은 빠른 학습과 자율성이 중요하므로 "혼자 새로운 기술을 학습해서 프로덕션에 적용한 경험"이나 "촉박한 데드라인에서 어떻게 우선순위를 정했는지"를 물어보세요. 정답보다는 문제 해결 접근법과 학습 태도를 평가합니다.',
      exampleQuestions: [
        '[프로젝트 경험] 가장 자랑스러운 프로젝트를 소개해주세요. 어떤 문제를 해결했고, 왜 그 기술 스택을 선택했나요? 회고한다면 어떤 부분을 개선하시겠습니까?',
        '[빠른 학습] 이전에 사용해보지 않은 기술/프레임워크를 빠르게 학습해서 실제 프로젝트에 적용한 경험이 있나요? 어떻게 학습하셨나요?',
        '[제한된 리소스] 혼자 또는 소규모 팀에서 빡빡한 데드라인에 프로젝트를 완수한 경험이 있나요? 어떻게 우선순위를 정했고, 무엇을 포기했나요?',
        '[기술적 타협] 코드 품질과 개발 속도가 충돌했던 경험이 있나요? 어떤 기준으로 의사결정하셨나요?',
        '[배포 및 운영] 본인이 만든 서비스를 직접 배포하고 운영한 경험이 있나요? CI/CD 파이프라인을 구축하거나 모니터링을 설정한 경험이 있나요?',
        '[풀스택 역량] 프론트엔드부터 백엔드, 인프라까지 전체 스택을 다뤄본 경험이 있나요? 어떤 부분이 가장 어려웠고, 어떻게 극복했나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: [
        '실제 프로젝트 구현 및 배포 경험',
        '새로운 기술을 빠르게 학습하는 능력',
        '자율적 문제 해결 능력 (스스로 학습하고 해결)',
        '스타트업 환경에 대한 이해와 적응력',
      ],
      redFlags: [
        '실제 구현 경험 없이 이론만 아는 경우',
        '새로운 기술 학습에 소극적',
        '명확한 가이드나 지시 없이는 일하기 어려워하는 태도',
        '실패 경험이나 어려웠던 점을 회피',
        '스타트업 = 워라밸 희생으로만 이해',
      ],
      greenFlags: [
        '개인 프로젝트나 오픈소스 기여 경험',
        '새로운 기술을 빠르게 학습해서 프로덕션에 적용한 경험',
        '"모르는 것을 어떻게 배웠는지" 구체적으로 설명',
        '혼자 문제를 해결하고 배포까지 완료한 경험',
        '실패 경험과 배운 점을 솔직히 공유',
        '스타트업 환경의 불확실성과 빠른 변화를 이해',
      ],
    },
    culture: {
      values: ['빠른 실행', '자율과 책임', '학습 문화', '고객 중심', '수평적 소통'],
      teamStructure: '소규모 팀 (5-20명), 풀스택 지향, 역할 경계가 유연함, 빠른 의사결정',
      techStack: [
        'React/Next.js',
        'Node.js/NestJS',
        'Python/FastAPI',
        'AWS/GCP',
        'PostgreSQL/MongoDB',
        'Docker/Kubernetes',
      ],
    },
  },
  {
    companyId: 'samsung-behavioral',
    displayName: '삼성 인성/임원면접',
    description:
      '삼성그룹 특유의 창의성 면접, PT 면접, 임원 면접 패턴을 재현합니다. 문제정의→원인분석→해결방안→기대효과 구조를 따릅니다.',
    interviewStructure: {
      rounds: ['창의성 면접 (30분)', 'PT 면접 (발표 10분 + Q&A 20분)', '임원 면접 (30분)'],
      focusAreas: ['창의적 문제해결', '논리적 사고', '조직 적합성', '리더십 잠재력'],
      timePerRound: '30분',
    },
    questionStyle: {
      emphasis: [
        'STAR 기법으로 구체적 경험 질문',
        '창의적 문제해결 시나리오',
        '조직 충성도와 장기 비전',
        '압박 면접 스타일의 깊이 있는 꼬리질문',
      ],
      avoidTopics: ['연봉 협상', '경쟁사 비교'],
      styleGuide:
        '삼성 임원면접 스타일로 진행합니다. 핵심가치(인재제일, 최고지향, 변화선도, 정도경영, 상생추구)에 부합하는지 확인하세요. 창의성 면접에서는 일상적 문제에 대한 창의적 해결책을, PT 면접에서는 논리적 구조화 능력을, 임원 면접에서는 인성과 조직 적합성을 평가합니다.',
      exampleQuestions: [
        '종이컵으로 할 수 있는 창의적인 활용 방법을 5가지 이상 말씀해주세요.',
        '최근 실패했던 경험을 STAR 기법으로 설명하고, 그 경험에서 무엇을 배웠는지 말씀해주세요.',
        '삼성의 핵심가치 중 본인과 가장 잘 맞는 것은 무엇이며, 그 이유를 구체적 사례로 설명해주세요.',
        '팀에서 본인의 의견이 무시당한 경험이 있다면, 어떻게 대처하셨나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: ['논리적 사고력', '창의성', '조직 적합성', '성장 잠재력'],
      redFlags: [
        '추상적이고 두루뭉술한 답변',
        '팀 성과를 개인 성과로 포장',
        '자기인식 부족',
        '삼성 핵심가치에 대한 이해 부족',
      ],
      greenFlags: ['구체적 수치와 사례', 'STAR 구조 답변', '실패 경험의 성찰', '장기적 비전 제시'],
    },
    culture: {
      values: ['인재제일', '최고지향', '변화선도', '정도경영', '상생추구'],
      teamStructure: '대규모 조직, 체계적 직급 체계, 사업부 단위 운영',
      techStack: [],
    },
  },
  {
    companyId: 'coupang-behavioral',
    displayName: '쿠팡 LP 행동면접',
    description:
      '쿠팡의 15개 Leadership Principles(LP)에 기반한 행동면접을 재현합니다. SBI(Situation-Behavior-Impact) 기법으로 과거 행동 사례를 심층 탐색합니다.',
    interviewStructure: {
      rounds: ['LP 기반 행동면접 1차 (45분)', 'LP 기반 행동면접 2차 (45분)', 'Bar Raiser 면접 (45분)'],
      focusAreas: ['Leadership Principles 체화', '구체적 행동 사례', '임팩트 중심 성과', '고객 중심 사고'],
      timePerRound: '45분',
    },
    questionStyle: {
      emphasis: [
        'LP별 구체적 행동 사례 질문',
        'SBI 기법으로 상황→행동→임팩트 구조화',
        '"Tell me about a time when..." 패턴',
        '데이터 기반 의사결정 사례',
      ],
      avoidTopics: ['이론적/가정적 질문', '기술 구현 디테일'],
      styleGuide:
        '쿠팡 LP 행동면접 스타일로 진행합니다. 각 질문은 반드시 과거의 구체적 행동 사례를 요구하세요. "~한 적이 있나요?"가 아니라 "~했던 구체적 경험을 말씀해주세요"로 질문합니다. Customer Obsession, Ownership, Bias for Action 등 LP에 기반하여 평가합니다.',
      exampleQuestions: [
        '고객의 니즈를 충족시키기 위해 기존 방식을 바꿨던 경험을 구체적으로 말씀해주세요. (Customer Obsession)',
        '팀의 목표와 본인의 의견이 충돌했을 때 어떻게 해결하셨나요? 구체적인 상황과 결과를 말씀해주세요. (Ownership)',
        '제한된 정보로 빠르게 의사결정해야 했던 상황을 설명해주세요. (Bias for Action)',
        '본인이 주도하여 프로세스나 시스템을 개선했던 경험이 있다면 SBI 구조로 설명해주세요.',
      ],
    },
    evaluationCriteria: {
      topPriorities: ['LP 체화 수준', '구체적 행동 사례의 질', '임팩트 크기', '고객 중심 사고'],
      redFlags: [
        '가정적/이론적 답변',
        '구체적 수치 없는 성과',
        'LP와 무관한 답변',
        '팀 성과만 언급하고 개인 기여 불명확',
      ],
      greenFlags: [
        'SBI 구조로 자연스럽게 답변',
        '정량적 임팩트 제시',
        '실패 사례에서의 학습',
        '고객 관점의 의사결정',
      ],
    },
    culture: {
      values: ['Customer Obsession', 'Ownership', 'Bias for Action', 'Dive Deep', 'Deliver Results'],
      teamStructure: '작은 팀(2-pizza team), 빠른 의사결정, 높은 자율성',
      techStack: [],
    },
  },
  {
    companyId: 'kakao-behavioral',
    displayName: '카카오 컬처핏 면접',
    description:
      '카카오의 동료 면접(컬처핏) 스타일을 재현합니다. 업무 스타일, 동기부여 요인, 팀 호환성을 중심으로 편안한 대화 형식으로 진행합니다.',
    interviewStructure: {
      rounds: ['동료 면접 / 컬처핏 (40분)', '팀 리드 면접 (30분)'],
      focusAreas: ['업무 스타일 호환성', '자기주도성', '커뮤니케이션 스타일', '성장 마인드셋'],
      timePerRound: '40분',
    },
    questionStyle: {
      emphasis: [
        '편안한 대화 톤으로 자연스럽게 질문',
        '업무 스타일과 가치관 탐색',
        '동기부여 요인과 성장 욕구 확인',
        '팀 내 갈등 해결 방식 파악',
      ],
      avoidTopics: ['압박 면접 스타일', '이론적 지식 테스트'],
      styleGuide:
        '카카오 컬처핏 면접 스타일로 진행합니다. 딱딱한 면접보다는 편안한 대화처럼 진행하세요. "같이 일하고 싶은 동료인가?"를 핵심 평가 기준으로 삼습니다. 카카오의 핵심가치(사용자를 향합니다, 같이의 가치를 믿습니다, 기술에 의미를 더합니다)에 부합하는지 자연스럽게 확인하세요.',
      exampleQuestions: [
        '일할 때 가장 에너지를 받는 순간은 언제인가요? 반대로 가장 힘든 순간은요?',
        '팀에서 의견 충돌이 있을 때 보통 어떤 역할을 하시나요? 최근 사례를 들어주세요.',
        '본인만의 업무 방식이나 습관이 있다면 소개해주세요.',
        '이직을 결심하게 된 계기가 무엇인가요? 카카오에서 어떤 점을 기대하시나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: ['팀 호환성', '자기주도성', '커뮤니케이션 능력', '성장 의지'],
      redFlags: ['수동적 태도', '갈등 회피 성향', '학습 의지 부족', '팀보다 개인 성과 중시'],
      greenFlags: ['자기주도적 문제 해결', '건설적 피드백 수용', '다양성 존중', '지속적 학습'],
    },
    culture: {
      values: ['사용자를 향합니다', '같이의 가치를 믿습니다', '기술에 의미를 더합니다'],
      teamStructure: '셀/팀 단위, 자율적 문화, 수평적 소통',
      techStack: [],
    },
  },
  {
    companyId: 'naver-behavioral',
    displayName: '네이버 조직적합성 면접',
    description:
      '네이버의 인성/조직적합성 면접 스타일을 재현합니다. 성장 가능성, 자기주도적 문제해결, 적응력을 중심으로 평가합니다.',
    interviewStructure: {
      rounds: ['인성 면접 (40분)', '임원 면접 (30분)'],
      focusAreas: ['성장 가능성', '자기주도 문제해결', '적응력', '기술 호기심'],
      timePerRound: '40분',
    },
    questionStyle: {
      emphasis: [
        '성장 경험과 학습 과정 탐색',
        '자기주도적 도전 사례',
        '변화 적응 경험',
        '기술적 호기심과 탐구 정신',
      ],
      avoidTopics: ['단순 지식 확인', '정답이 정해진 질문'],
      styleGuide:
        '네이버 조직적합성 면접 스타일로 진행합니다. 네이버는 "기술로 연결하고 발전시킨다"는 미션 아래 자기주도적이고 성장 지향적인 인재를 찾습니다. 지원자의 성장 과정, 도전 경험, 실패에서의 회복을 중심으로 질문하세요.',
      exampleQuestions: [
        '가장 빠르게 성장했다고 느꼈던 시기는 언제이고, 어떤 노력을 하셨나요?',
        '스스로 문제를 정의하고 해결했던 경험이 있다면 구체적으로 말씀해주세요.',
        '새로운 기술이나 도메인을 학습해야 했던 경험에서 어떻게 접근하셨나요?',
        '조직에서 예상치 못한 변화가 있었을 때 어떻게 적응하셨나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: ['성장 가능성', '자기주도성', '문제 해결 능력', '적응력'],
      redFlags: ['성장 의지 부족', '수동적 학습 태도', '변화 저항', '단편적 경험만 나열'],
      greenFlags: [
        '체계적 학습 방법론',
        '자발적 도전',
        '실패에서의 학습',
        '주변에 대한 긍정적 영향력',
      ],
    },
    culture: {
      values: ['도전', '성장', '사용자 중심', '기술 혁신'],
      teamStructure: '조직별 자율 운영, 기술 중심 문화, 사내 기술 공유 활발',
      techStack: [],
    },
  },
  {
    companyId: 'toss-behavioral',
    displayName: '토스 컬처핏 면접',
    description:
      '토스(비바리퍼블리카)의 컬처핏 면접을 재현합니다. 프로덕트 사고, 높은 주도성, Extreme Ownership을 중심으로 평가합니다.',
    interviewStructure: {
      rounds: ['컬처핏 면접 (40분)', 'CTO/리더 1:1 면접 (30분)'],
      focusAreas: ['Extreme Ownership', '프로덕트 사고', '높은 기준(High Bar)', '임팩트 중심 사고'],
      timePerRound: '40분',
    },
    questionStyle: {
      emphasis: [
        '문제의 근본 원인까지 파고드는 질문',
        '"왜?"를 반복하여 사고의 깊이 확인',
        '임팩트와 결과 중심의 성과 질문',
        '본인의 기준(bar)이 얼마나 높은지 확인',
      ],
      avoidTopics: ['형식적 질문', '일반적인 장단점'],
      styleGuide:
        '토스 컬처핏 면접 스타일로 진행합니다. 토스는 "Extreme Ownership"을 핵심 가치로 삼습니다. 지원자가 문제를 본인의 것으로 받아들이고 끝까지 해결하는 사람인지, 높은 기준을 가지고 일하는지를 확인하세요. "왜 그렇게 했나요?" "더 나은 방법은 없었나요?"로 깊이를 탐색합니다.',
      exampleQuestions: [
        '본인이 주도적으로 문제를 발견하고 해결한 경험을 말씀해주세요. 아무도 시키지 않았는데 본인이 나서서 한 일이면 좋겠습니다.',
        '최근 일에서 가장 자랑스러운 성과는 무엇인가요? 구체적 임팩트를 수치로 설명해주세요.',
        '본인의 기준이 팀의 기준보다 높아서 갈등이 생겼던 경험이 있나요? 어떻게 해결하셨나요?',
        '만약 다시 그 프로젝트를 한다면 무엇을 다르게 하시겠어요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: ['Extreme Ownership', '임팩트 크기', '높은 기준', '프로덕트 사고'],
      redFlags: ['남 탓', '수동적 태도', '임팩트 설명 불가', '현상 유지 지향'],
      greenFlags: [
        '자발적 문제 발견/해결',
        '정량적 성과',
        '끊임없는 개선 의지',
        '사용자 관점 사고',
      ],
    },
    culture: {
      values: ['Extreme Ownership', 'High Bar', 'Customer First', 'Move Fast'],
      teamStructure: '사일로(Silo) 조직, 풀스택 팀, 높은 자율성과 책임',
      techStack: [],
    },
  },
  {
    companyId: 'general-behavioral',
    displayName: '일반 인성면접',
    description:
      '표준 구조화 인성면접을 진행합니다. STAR 기법을 기반으로 지원자의 역량, 가치관, 조직 적합성을 종합적으로 평가합니다.',
    interviewStructure: {
      rounds: ['인성면접 (40분)'],
      focusAreas: ['자기소개/지원동기', '경험/역량', '가치관/조직적합성', '성장 가능성'],
      timePerRound: '40분',
    },
    questionStyle: {
      emphasis: [
        'STAR 기법 기반 구조화 질문',
        '과거 행동 사례 중심',
        '구체적 상황과 결과 요구',
        '자기인식과 성찰 확인',
      ],
      avoidTopics: ['개인정보 침해 질문', '차별적 질문'],
      styleGuide:
        '표준 구조화 인성면접으로 진행합니다. STAR 기법(Situation-Task-Action-Result)을 활용하여 질문하고, 지원자의 답변이 추상적이면 "구체적인 사례를 들어주세요"로 구체화를 유도하세요. 공정하고 일관된 평가를 위해 모든 지원자에게 동일한 구조의 질문을 하되, 답변에 따라 꼬리질문을 조절하세요.',
      exampleQuestions: [
        '간단히 자기소개와 지원동기를 말씀해주세요.',
        '가장 도전적이었던 업무 경험을 STAR 기법으로 설명해주세요.',
        '팀에서 갈등이 있었던 경험과 어떻게 해결하셨는지 말씀해주세요.',
        '본인의 가장 큰 강점과 약점은 무엇이라고 생각하시나요? 약점을 극복하기 위해 어떤 노력을 하고 계시나요?',
      ],
    },
    evaluationCriteria: {
      topPriorities: ['구체성', 'STAR 구조', '자기인식', '성장 마인드셋'],
      redFlags: [
        '추상적/두루뭉술한 답변',
        '사례 없이 원론적 답변',
        '과도한 자기 포장',
        '타인 비난',
      ],
      greenFlags: [
        'STAR 구조 활용',
        '구체적 수치/결과',
        '실패에서 배운 점',
        '진솔한 자기 성찰',
      ],
    },
    culture: {
      values: ['성실', '협업', '성장', '책임감'],
      teamStructure: '일반적인 팀 구조',
      techStack: [],
    },
  },
];

/**
 * Get company interview style by companyId
 */
export function getCompanyStyle(companyId: string): CompanyInterviewStyle | undefined {
  return COMPANY_STYLES.find((style) => style.companyId === companyId);
}

/**
 * Get list of available company styles (for UI selection)
 */
export function getAvailableCompanyStyles(): Array<{
  companyId: string;
  displayName: string;
  description: string;
}> {
  return COMPANY_STYLES.map((style) => ({
    companyId: style.companyId,
    displayName: style.displayName,
    description: style.description,
  }));
}

/**
 * Get recommended topics based on company tech stack
 */
export function getRecommendedTopics(companyStyleId: string): string[] {
  const style = getCompanyStyle(companyStyleId);
  if (!style) return [];
  return style.culture.techStack;
}

/**
 * Build company style section for prompt injection
 */
export function buildCompanyStyleSection(style: CompanyInterviewStyle): string {
  return `## 면접 스타일: ${style.displayName}

${style.description}

### 면접 구조
- 라운드: ${style.interviewStructure.rounds.join(' → ')}
- 핵심 평가 영역: ${style.interviewStructure.focusAreas.join(', ')}
- 라운드당 시간: ${style.interviewStructure.timePerRound}

### 질문 스타일 가이드
${style.questionStyle.styleGuide}

**질문 시 강조할 점:**
${style.questionStyle.emphasis.map((item) => `- ${item}`).join('\n')}

**피할 주제:**
${style.questionStyle.avoidTopics.map((item) => `- ${item}`).join('\n')}

**예시 질문:**
${style.questionStyle.exampleQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### 평가 기준
**최우선 평가:**
${style.evaluationCriteria.topPriorities.map((item) => `- ${item}`).join('\n')}

**긍정 신호 (Green Flags):**
${style.evaluationCriteria.greenFlags.map((item) => `- ${item}`).join('\n')}

**부정 신호 (Red Flags):**
${style.evaluationCriteria.redFlags.map((item) => `- ${item}`).join('\n')}

### 회사 문화 및 기술 스택
**핵심 가치:** ${style.culture.values.join(', ')}
**팀 구조:** ${style.culture.teamStructure}
**기술 스택:** ${style.culture.techStack.join(', ')}
`;
}
