import type { TechKnowledgeBase } from '../types';

const fastapiKnowledge: TechKnowledgeBase = {
  techId: 'fastapi',
  displayName: 'FastAPI',
  category: 'backend',
  version: '0.100+',
  topics: {
    junior: [
      {
        id: 'fastapi-pydantic-validation',
        topic: 'Pydantic 모델과 타입 검증',
        description: '자동 유효성 검사',
        sampleQuestions: [
          'Pydantic BaseModel은 무엇이며 어떻게 사용하나요?',
          'FastAPI가 자동으로 유효성 검사를 하는 원리는?',
          'Request Body, Query Parameters, Path Parameters의 차이는?'
        ],
        keyConceptsToProbe: [
          'Pydantic은 타입 힌트 기반 데이터 검증, JSON 직렬화',
          'FastAPI는 타입 힌트를 읽어 자동 검증/문서화',
          'Body는 POST 본문, Query는 ?key=value, Path는 /users/{id}'
        ],
        followUpAngles: [
          'Field()로 추가 검증은 어떻게 하나요?',
          'Optional vs Union[..., None]?',
          'Pydantic의 validator는 어떻게 사용하나요?'
        ],
        tags: ['pydantic', 'validation', 'types', 'request']
      },
      {
        id: 'fastapi-dependency-injection',
        topic: '의존성 주입',
        description: 'Depends()로 재사용 가능한 로직',
        sampleQuestions: [
          'FastAPI의 의존성 주입은 어떻게 동작하나요?',
          'Depends()는 언제 사용하나요?',
          'Dependencies를 여러 엔드포인트에서 공유하는 방법은?'
        ],
        keyConceptsToProbe: [
          'Depends()로 함수/클래스 주입, 자동 호출 및 결과 전달',
          'DB 세션, 인증, 공통 로직 재사용',
          'router dependencies, app dependencies로 전역 적용'
        ],
        followUpAngles: [
          'yield를 사용한 의존성 정리는?',
          'Sub-dependencies는 무엇인가요?',
          'Annotated를 사용한 의존성 정의는?'
        ],
        tags: ['dependency-injection', 'depends', 'reusability']
      },
      {
        id: 'fastapi-async-basics',
        topic: 'async/await 기초',
        description: '비동기 함수',
        sampleQuestions: [
          'FastAPI에서 async def와 def의 차이는?',
          '언제 async를 사용하고 언제 sync를 사용하나요?',
          'await 키워드는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'async def는 비동기 실행, def는 스레드 풀에서 실행',
          'I/O bound (DB, HTTP)는 async, CPU bound는 sync',
          'await는 비동기 함수 호출, 결과 기다림'
        ],
        followUpAngles: [
          'asyncio.gather()는 어떻게 사용하나요?',
          'Blocking 코드를 async 함수에서 사용하면?',
          'httpx vs requests 차이는?'
        ],
        tags: ['async', 'await', 'asyncio', 'concurrency']
      }
    ],
    mid: [
      {
        id: 'fastapi-middleware-events',
        topic: '미들웨어와 이벤트 핸들러',
        description: 'Request/Response 처리',
        sampleQuestions: [
          'FastAPI에서 미들웨어를 어떻게 추가하나요?',
          'startup/shutdown 이벤트 핸들러는 언제 사용하나요?',
          'CORS 미들웨어는 어떻게 설정하나요?'
        ],
        keyConceptsToProbe: [
          '@app.middleware("http")로 정의, request/call_next',
          'lifespan 이벤트로 DB 연결, 리소스 초기화/정리',
          'CORSMiddleware로 origin, methods, headers 설정'
        ],
        followUpAngles: [
          'BaseHTTPMiddleware vs ASGI Middleware?',
          'lifespan context manager는 무엇인가요?',
          'Background Tasks는 어떻게 사용하나요?'
        ],
        tags: ['middleware', 'events', 'cors', 'lifespan']
      },
      {
        id: 'fastapi-security',
        topic: '보안 (OAuth2, JWT)',
        description: '인증과 권한',
        sampleQuestions: [
          'FastAPI에서 JWT 인증을 어떻게 구현하나요?',
          'OAuth2PasswordBearer는 무엇인가요?',
          'Security Scopes는 어떻게 사용하나요?'
        ],
        keyConceptsToProbe: [
          'OAuth2PasswordBearer로 토큰 추출, jose/python-jose로 JWT',
          'OAuth2 Bearer 토큰 스키마, Authorization 헤더',
          'Security Scopes로 세분화된 권한 (read:users, write:items)'
        ],
        followUpAngles: [
          'HTTPBearer vs OAuth2PasswordBearer?',
          'Refresh Token은 어떻게 구현하나요?',
          'API Key 인증은 어떻게 하나요?'
        ],
        tags: ['security', 'oauth2', 'jwt', 'authentication']
      },
      {
        id: 'fastapi-testing',
        topic: '테스팅 (TestClient, pytest)',
        description: 'API 테스트',
        sampleQuestions: [
          'TestClient로 API를 어떻게 테스트하나요?',
          'pytest fixture를 사용한 경험은?',
          '비동기 테스트는 어떻게 작성하나요?'
        ],
        keyConceptsToProbe: [
          'TestClient로 app 테스트, requests 같은 API',
          'pytest fixture로 DB 설정, 의존성 오버라이드',
          'pytest-asyncio로 async def test, @pytest.mark.asyncio'
        ],
        followUpAngles: [
          'app.dependency_overrides는 무엇인가요?',
          'DB Transaction Rollback 패턴은?',
          'Mocking은 어떻게 하나요?'
        ],
        tags: ['testing', 'testclient', 'pytest', 'fixtures']
      }
    ],
    senior: [
      {
        id: 'fastapi-large-scale-architecture',
        topic: '대규모 FastAPI 아키텍처',
        description: 'Project Structure, Routers',
        sampleQuestions: [
          '대규모 FastAPI 프로젝트를 어떻게 구조화하나요?',
          'APIRouter를 사용한 모듈화 경험은?',
          'Repository Pattern을 적용한 경험은?'
        ],
        keyConceptsToProbe: [
          '도메인별 폴더, router/service/repository/model 계층',
          'APIRouter로 엔드포인트 그룹화, prefix/tags/dependencies',
          'Repository로 DB 추상화, Service로 비즈니스 로직'
        ],
        followUpAngles: [
          'Domain-Driven Design을 적용한 경험은?',
          'API Versioning은 어떻게 하나요?',
          'Monorepo vs Multi-Service?'
        ],
        tags: ['architecture', 'routers', 'repository', 'scaling']
      },
      {
        id: 'fastapi-high-performance',
        topic: '고성능 비동기 처리',
        description: 'asyncio, connection pooling',
        sampleQuestions: [
          'asyncio로 동시성을 최적화한 경험은?',
          'DB Connection Pool은 어떻게 설정하나요?',
          'Rate Limiting을 어떻게 구현하나요?'
        ],
        keyConceptsToProbe: [
          'asyncio.gather/create_task로 병렬 처리, Semaphore로 제한',
          'SQLAlchemy async, asyncpg, pool_size/max_overflow 설정',
          'slowapi, Redis 기반 Token Bucket'
        ],
        followUpAngles: [
          'Gunicorn + Uvicorn Worker 설정은?',
          'Backpressure는 어떻게 처리하나요?',
          'APM (Datadog, Sentry) 통합 경험은?'
        ],
        tags: ['performance', 'asyncio', 'connection-pool', 'optimization']
      },
      {
        id: 'fastapi-microservices',
        topic: '마이크로서비스 통합',
        description: 'gRPC, Message Queue',
        sampleQuestions: [
          'FastAPI 간 통신을 어떻게 구현하나요?',
          'gRPC와 REST API의 선택 기준은?',
          'RabbitMQ/Kafka를 FastAPI와 통합한 경험은?'
        ],
        keyConceptsToProbe: [
          'httpx로 HTTP 통신, gRPC로 내부 서비스 통신',
          'gRPC는 빠름, 타입 안전, binary; REST는 디버깅 쉬움',
          'aio-pika/aiokafka로 비동기 메시지 처리'
        ],
        followUpAngles: [
          'Service Mesh (Istio)를 사용한 경험은?',
          'Circuit Breaker 패턴은 어떻게 구현하나요?',
          'Distributed Tracing (OpenTelemetry)은?'
        ],
        tags: ['microservices', 'grpc', 'message-queue', 'integration']
      }
    ]
  },
  commonMistakes: [
    'sync 함수에서 blocking DB 호출 (스레드 풀 고갈)',
    'async 함수에서 sync ORM 직접 사용 (await 필요)',
    'Pydantic 모델 재사용으로 의도치 않은 필드 노출',
    'Background Task에서 예외 처리 누락'
  ],
  bestPractices: [
    '비동기 DB 드라이버 (asyncpg, motor) 사용',
    'Pydantic BaseSettings로 환경 변수 관리',
    'APIRouter로 모듈화, 도메인별 분리',
    'Dependency Injection으로 테스트 용이성',
    'Alembic으로 DB 마이그레이션'
  ],
  relatedTechnologies: ['python', 'pydantic', 'sqlalchemy', 'postgresql', 'redis']
};

export default fastapiKnowledge;
