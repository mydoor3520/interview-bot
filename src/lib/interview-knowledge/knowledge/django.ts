import type { TechKnowledgeBase } from '../types';

const djangoKnowledge: TechKnowledgeBase = {
  techId: 'django',
  displayName: 'Django',
  category: 'backend',
  version: '5+',
  topics: {
    junior: [
      {
        id: 'django-mvt-pattern',
        topic: 'MVT 패턴',
        description: 'Model-View-Template 아키텍처',
        sampleQuestions: [
          'Django의 MVT 패턴을 설명해주세요',
          'View와 Template의 역할은 무엇인가요?',
          'URL 라우팅은 어떻게 동작하나요?'
        ],
        keyConceptsToProbe: [
          'Model은 데이터, View는 로직, Template은 HTML 렌더링',
          'View는 request를 받아 response 반환, Template은 Jinja 유사',
          'urls.py에서 URL 패턴 정의, path()/re_path() 사용'
        ],
        followUpAngles: [
          'Function-Based View vs Class-Based View?',
          'URLconf의 include()는 어떻게 사용하나요?',
          'Django Template Language의 필터/태그는?'
        ],
        tags: ['mvt', 'views', 'templates', 'urls']
      },
      {
        id: 'django-orm-basics',
        topic: 'ORM 기초와 QuerySet',
        description: '데이터베이스 추상화',
        sampleQuestions: [
          'Django ORM은 무엇이며 어떻게 사용하나요?',
          'filter()와 get()의 차이는?',
          'Migration은 어떻게 생성하고 적용하나요?'
        ],
        keyConceptsToProbe: [
          'ORM은 SQL 추상화, 파이썬 코드로 DB 조작',
          'filter()는 QuerySet 반환, get()은 단일 객체 (없으면 예외)',
          'makemigrations로 생성, migrate로 적용'
        ],
        followUpAngles: [
          'ForeignKey와 ManyToManyField는?',
          'QuerySet은 언제 평가(evaluate)되나요?',
          'Model Meta 옵션은 무엇인가요?'
        ],
        tags: ['orm', 'queryset', 'models', 'migrations']
      },
      {
        id: 'django-rest-framework-basics',
        topic: 'Django REST Framework 기본',
        description: 'RESTful API 구축',
        sampleQuestions: [
          'DRF의 Serializer는 무엇인가요?',
          'APIView와 ViewSet의 차이는?',
          'Router는 어떻게 사용하나요?'
        ],
        keyConceptsToProbe: [
          'Serializer는 Model↔JSON 변환, 유효성 검사',
          'APIView는 메서드별 핸들러, ViewSet은 CRUD 액션 자동',
          'Router는 ViewSet을 URL에 자동 매핑'
        ],
        followUpAngles: [
          'ModelSerializer vs Serializer?',
          'Generic Views는 무엇인가요?',
          'Browsable API는 무엇인가요?'
        ],
        tags: ['drf', 'rest-api', 'serializers', 'viewsets']
      }
    ],
    mid: [
      {
        id: 'django-queryset-optimization',
        topic: 'QuerySet 최적화',
        description: 'N+1 문제 해결',
        sampleQuestions: [
          'select_related와 prefetch_related의 차이는?',
          'N+1 쿼리 문제를 어떻게 해결하나요?',
          'only()와 defer()는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'select_related는 JOIN (1:1, N:1), prefetch_related는 별도 쿼리 (M:N, 역참조)',
          'N+1은 related 객체 접근 시 추가 쿼리, select/prefetch로 해결',
          'only()는 필드 제한 로드, defer()는 지연 로드'
        ],
        followUpAngles: [
          'Prefetch 객체는 어떻게 사용하나요?',
          'annotate()와 aggregate()의 차이는?',
          'Query Hint는 무엇인가요?'
        ],
        tags: ['optimization', 'queryset', 'n+1', 'performance']
      },
      {
        id: 'django-auth-permissions',
        topic: '인증과 권한 시스템',
        description: 'User, Group, Permission',
        sampleQuestions: [
          'Django의 기본 인증 시스템을 설명해주세요',
          'Custom User Model은 어떻게 만드나요?',
          'DRF의 Permission Classes는?'
        ],
        keyConceptsToProbe: [
          'User, Group, Permission 모델, 세션 기반 인증',
          'AUTH_USER_MODEL 설정, AbstractBaseUser 상속',
          'IsAuthenticated, IsAdminUser, Custom Permission'
        ],
        followUpAngles: [
          'JWT vs Session 인증?',
          'Object-Level Permission은 어떻게 구현하나요?',
          'AllowAny와 IsAuthenticatedOrReadOnly는?'
        ],
        tags: ['authentication', 'permissions', 'user', 'security']
      },
      {
        id: 'django-signals-middleware',
        topic: '시그널과 미들웨어',
        description: '이벤트 기반 로직',
        sampleQuestions: [
          'Django Signal은 무엇이며 언제 사용하나요?',
          'pre_save와 post_save의 차이는?',
          'Custom Middleware는 어떻게 작성하나요?'
        ],
        keyConceptsToProbe: [
          'Signal은 decoupled 이벤트, 모델 저장/삭제 시 후킹',
          'pre_save는 저장 전, post_save는 저장 후',
          'Middleware는 요청/응답 처리 파이프라인, __call__ 구현'
        ],
        followUpAngles: [
          'Signal의 단점은 무엇인가요?',
          'Middleware 순서는 중요한가요?',
          'Context Processor는 무엇인가요?'
        ],
        tags: ['signals', 'middleware', 'hooks', 'events']
      }
    ],
    senior: [
      {
        id: 'django-large-scale-architecture',
        topic: 'Django 대규모 아키텍처',
        description: 'Project Structure, Apps',
        sampleQuestions: [
          '대규모 Django 프로젝트의 앱 분리 전략은?',
          'Reusable Apps를 어떻게 설계하나요?',
          'Service Layer 패턴을 적용한 경험은?'
        ],
        keyConceptsToProbe: [
          '도메인별 앱 분리, core/utils/api 공통 레이어',
          '의존성 최소화, 명확한 인터페이스, pypi 패키지화',
          'Fat Models 회피, 비즈니스 로직을 Service로 분리'
        ],
        followUpAngles: [
          'Django의 INSTALLED_APPS 순서는 중요한가요?',
          'AppConfig를 활용한 초기화 로직은?',
          'Monorepo vs Multi-Repo?'
        ],
        tags: ['architecture', 'apps', 'service-layer', 'scaling']
      },
      {
        id: 'django-async',
        topic: '비동기 Django (ASGI, Channels)',
        description: 'Async Views, WebSocket',
        sampleQuestions: [
          'Django의 ASGI vs WSGI 차이는?',
          'Async View는 언제 사용하나요?',
          'Django Channels로 WebSocket을 구현한 경험은?'
        ],
        keyConceptsToProbe: [
          'ASGI는 비동기 지원, WebSocket, HTTP2; WSGI는 동기 전용',
          'async def view, ORM은 sync_to_async/async_to_sync 필요',
          'Channels는 WebSocket, Chat, Real-time 알림'
        ],
        followUpAngles: [
          'Channel Layer (Redis)는 무엇인가요?',
          'Async ORM 쿼리는 어떻게 하나요?',
          'Celery vs Django-Q vs Channels?'
        ],
        tags: ['async', 'asgi', 'channels', 'websocket']
      },
      {
        id: 'django-multitenancy',
        topic: '멀티테넌시',
        description: 'SaaS 아키텍처',
        sampleQuestions: [
          '멀티테넌시를 Django에서 어떻게 구현하나요?',
          'Schema-based vs Shared Schema 전략?',
          'django-tenants 라이브러리를 사용한 경험은?'
        ],
        keyConceptsToProbe: [
          'Tenant별 데이터 격리, 서브도메인/경로 기반 분리',
          'Schema-based는 DB 스키마 분리, Shared는 tenant_id 필터',
          'django-tenants는 PostgreSQL 스키마 기반'
        ],
        followUpAngles: [
          'Migration을 Tenant별로 어떻게 관리하나요?',
          'Tenant 간 데이터 공유는 어떻게 하나요?',
          'Performance 고려사항은?'
        ],
        tags: ['multitenancy', 'saas', 'tenants', 'architecture']
      }
    ]
  },
  commonMistakes: [
    'select_related/prefetch_related 누락으로 N+1 쿼리',
    'QuerySet을 루프에서 필터링 (DB에서 필터링해야 함)',
    'Signal에서 무거운 작업 수행 (Celery로 비동기 처리)',
    'Custom User Model을 프로젝트 초기에 설정 안 함'
  ],
  bestPractices: [
    'Fat Models, Thin Views, Service Layer 분리',
    'select_related/prefetch_related로 쿼리 최적화',
    'DRF Serializer로 명확한 API 계약',
    'Celery로 무거운 작업 비동기 처리',
    'django-extensions, django-debug-toolbar로 개발 생산성'
  ],
  relatedTechnologies: ['python', 'postgresql', 'redis', 'celery', 'drf']
};

export default djangoKnowledge;
