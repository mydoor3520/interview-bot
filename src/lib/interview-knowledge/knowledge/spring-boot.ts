import type { TechKnowledgeBase } from '../types';

const springBootKnowledge: TechKnowledgeBase = {
  techId: 'spring-boot',
  displayName: 'Spring Boot',
  category: 'backend',
  version: '3.x',
  topics: {
    junior: [
      {
        id: 'spring-boot-ioc-di',
        topic: 'Spring IoC/DI 기초',
        description: '제어의 역전과 의존성 주입 이해',
        sampleQuestions: [
          'IoC(Inversion of Control)와 DI(Dependency Injection)의 차이는?',
          '@Autowired, @Component, @Service의 역할은 무엇인가요?',
          '생성자 주입과 필드 주입 중 어느 것이 권장되나요?'
        ],
        keyConceptsToProbe: [
          'IoC는 제어권을 프레임워크에 위임, DI는 의존성을 외부에서 주입',
          '@Component는 빈 등록, @Service는 비즈니스 로직 레이어 표시',
          '생성자 주입이 권장 (불변성, 순환 참조 컴파일 타임 감지)'
        ],
        followUpAngles: [
          '@Autowired(required=false)는 언제 사용하나요?',
          '순환 참조 문제를 어떻게 해결하나요?',
          'ApplicationContext와 BeanFactory의 차이는?'
        ],
        tags: ['ioc', 'di', 'autowired', 'bean']
      },
      {
        id: 'spring-boot-rest-api',
        topic: 'REST API 개발',
        description: 'RESTful 웹 서비스 구현',
        sampleQuestions: [
          '@RestController와 @Controller의 차이는?',
          'RESTful API 설계 원칙을 설명해주세요',
          'DTO와 Entity를 분리하는 이유는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          '@RestController는 @ResponseBody 자동 적용',
          '자원 중심 URL, HTTP 메서드 활용, 상태 코드 적절히 사용',
          'DTO는 API 계층, Entity는 영속성 계층 (관심사 분리)'
        ],
        followUpAngles: [
          '@RequestParam과 @PathVariable의 차이는?',
          'HTTP 상태 코드 200, 201, 204, 400, 404, 500을 언제 사용하나요?',
          'HATEOAS는 무엇인가요?'
        ],
        tags: ['rest-api', 'controller', 'dto', 'http']
      },
      {
        id: 'spring-boot-jpa-basics',
        topic: 'JPA/Hibernate 기초',
        description: 'ORM을 통한 데이터베이스 접근',
        sampleQuestions: [
          'JPA와 Hibernate의 관계는?',
          '@Entity, @Id, @Column 어노테이션의 역할은?',
          'JpaRepository의 기본 메서드를 설명해주세요'
        ],
        keyConceptsToProbe: [
          'JPA는 명세, Hibernate는 구현체',
          '@Entity는 테이블 매핑, @Id는 PK, @Column은 컬럼 매핑',
          'save, findById, findAll, delete 등 CRUD 기본 제공'
        ],
        followUpAngles: [
          'Persistence Context는 무엇인가요?',
          'JPQL과 Native Query의 차이는?',
          '@OneToMany, @ManyToOne 연관 관계 설정은?'
        ],
        tags: ['jpa', 'hibernate', 'orm', 'entity']
      }
    ],
    mid: [
      {
        id: 'spring-boot-security',
        topic: 'Spring Security 심화',
        description: '인증/인가 구현',
        sampleQuestions: [
          'Spring Security의 Filter Chain 동작 원리는?',
          'JWT 기반 인증을 어떻게 구현하나요?',
          'CORS와 CSRF 설정은 어떻게 하나요?'
        ],
        keyConceptsToProbe: [
          'FilterChainProxy가 여러 Filter를 순차 실행',
          'JwtAuthenticationFilter로 토큰 검증, SecurityContext에 인증 정보 저장',
          'CORS는 CorsConfigurationSource, CSRF는 stateless API에서 disable'
        ],
        followUpAngles: [
          'AuthenticationManager와 AuthenticationProvider의 역할은?',
          'OAuth2 Resource Server 구현 경험은?',
          'Method Security (@PreAuthorize)는 언제 사용하나요?'
        ],
        tags: ['security', 'authentication', 'authorization', 'jwt']
      },
      {
        id: 'spring-boot-transaction',
        topic: '트랜잭션 관리',
        description: '@Transactional 이해와 격리 수준',
        sampleQuestions: [
          '@Transactional의 동작 원리는?',
          'Propagation과 Isolation의 차이는?',
          '읽기 전용 트랜잭션은 왜 사용하나요?'
        ],
        keyConceptsToProbe: [
          'AOP Proxy가 메서드 호출 전후로 트랜잭션 시작/커밋',
          'Propagation은 트랜잭션 전파, Isolation은 격리 수준',
          'readOnly=true는 성능 최적화, dirty checking 비활성화'
        ],
        followUpAngles: [
          'REQUIRES_NEW와 NESTED의 차이는?',
          'private 메서드에 @Transactional을 붙이면?',
          'LazyInitializationException은 왜 발생하나요?'
        ],
        tags: ['transaction', 'aop', 'propagation', 'isolation']
      },
      {
        id: 'spring-boot-testing',
        topic: '테스팅 전략 (MockMvc, @DataJpaTest)',
        description: '계층별 테스트 작성',
        sampleQuestions: [
          '@SpringBootTest와 @WebMvcTest의 차이는?',
          '@DataJpaTest는 언제 사용하나요?',
          'Mockito를 활용한 단위 테스트 경험은?'
        ],
        keyConceptsToProbe: [
          '@SpringBootTest는 전체 컨텍스트, @WebMvcTest는 웹 레이어만',
          '@DataJpaTest는 JPA 레이어만, 인메모리 DB 자동 설정',
          '@Mock, @InjectMocks, when().thenReturn() 패턴'
        ],
        followUpAngles: [
          'TestContainers를 사용한 경험은?',
          '@Sql 어노테이션으로 데이터 초기화는?',
          'integration test와 unit test 비율은?'
        ],
        tags: ['testing', 'mockmvc', 'mockito', 'test-slicing']
      }
    ],
    senior: [
      {
        id: 'spring-boot-msa',
        topic: 'MSA 아키텍처 (Spring Cloud)',
        description: '분산 시스템 설계',
        sampleQuestions: [
          'Spring Cloud를 사용한 MSA 경험을 말씀해주세요',
          'Service Discovery와 API Gateway의 역할은?',
          '분산 트랜잭션은 어떻게 처리하나요?'
        ],
        keyConceptsToProbe: [
          'Eureka/Consul로 서비스 등록/발견, Gateway로 라우팅/인증',
          'Saga 패턴 (Choreography/Orchestration), 이벤트 기반',
          'Spring Cloud Stream, Kafka, RabbitMQ'
        ],
        followUpAngles: [
          'Circuit Breaker (Resilience4j)는 왜 필요한가요?',
          'Config Server로 설정 중앙화 경험은?',
          'Distributed Tracing (Zipkin, Sleuth)은 어떻게 구현하나요?'
        ],
        tags: ['msa', 'spring-cloud', 'distributed-system', 'saga']
      },
      {
        id: 'spring-boot-large-scale',
        topic: '대용량 트래픽 처리',
        description: '성능 최적화와 확장성',
        sampleQuestions: [
          'N+1 문제를 해결한 경험을 말씀해주세요',
          '캐싱 전략은 어떻게 수립하나요?',
          'DB Connection Pool 튜닝 경험은?'
        ],
        keyConceptsToProbe: [
          'fetch join, @EntityGraph, batch size 설정',
          '@Cacheable (Spring Cache), Redis, local cache',
          'HikariCP 설정 (maximumPoolSize, connectionTimeout)'
        ],
        followUpAngles: [
          'Read Replica 분기 전략은?',
          'Async 처리 (@Async, CompletableFuture)는?',
          'Batch 작업 최적화 (Spring Batch) 경험은?'
        ],
        tags: ['performance', 'caching', 'connection-pool', 'optimization']
      },
      {
        id: 'spring-boot-monitoring',
        topic: '모니터링/장애 대응',
        description: '운영 환경 안정성',
        sampleQuestions: [
          'Spring Actuator로 어떤 지표를 모니터링하나요?',
          '장애 발생 시 원인을 어떻게 추적하나요?',
          'graceful shutdown을 구현한 경험은?'
        ],
        keyConceptsToProbe: [
          '/actuator/health, /metrics, Prometheus + Grafana 연동',
          '로그 분석 (ELK Stack), APM (Pinpoint, Scouter)',
          'server.shutdown=graceful, 진행 중 요청 완료 후 종료'
        ],
        followUpAngles: [
          'Custom Health Indicator를 만든 경험은?',
          'Circuit Breaker 메트릭 수집은?',
          'Blue-Green 배포 시 헬스체크 전략은?'
        ],
        tags: ['monitoring', 'actuator', 'apm', 'logging']
      }
    ]
  },
  commonMistakes: [
    'N+1 쿼리 문제: 연관 관계 조회 시 fetch join 미사용',
    '순환 참조: 컴포넌트 간 의존성 양방향 설정',
    'Transaction Propagation 오해: REQUIRES_NEW 남용',
    'Lazy Loading 프록시: 트랜잭션 밖에서 연관 엔티티 접근'
  ],
  bestPractices: [
    '계층 분리: Controller - Service - Repository',
    'DTO 패턴으로 Entity 노출 방지',
    '설정 외부화 (@ConfigurationProperties, application.yml)',
    '테스트 슬라이싱으로 빠른 피드백 루프'
  ],
  relatedTechnologies: ['java', 'kotlin', 'jpa', 'postgresql', 'redis', 'kafka']
};

export default springBootKnowledge;
