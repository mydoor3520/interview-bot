import type { TechKnowledgeBase } from '../types';

const angularKnowledge: TechKnowledgeBase = {
  techId: 'angular',
  displayName: 'Angular',
  category: 'frontend',
  version: '17+',
  topics: {
    junior: [
      {
        id: 'angular-typescript-basics',
        topic: 'TypeScript와 Angular',
        description: 'Angular의 TypeScript 활용',
        sampleQuestions: [
          'Angular가 TypeScript를 기본으로 사용하는 이유는?',
          'Decorator (@Component, @Injectable)는 무엇인가요?',
          'Interface와 Class의 차이는?'
        ],
        keyConceptsToProbe: [
          'TypeScript는 타입 안전성, 클래스 기반 개발, 디코레이터 지원',
          'Decorator는 메타데이터 부착, Angular가 컴포넌트/서비스 인식',
          'Interface는 타입 정의만, Class는 런타임 객체 생성'
        ],
        followUpAngles: [
          'Decorator는 어떻게 동작하나요?',
          'TypeScript의 접근 제어자 (public, private, protected)는?',
          'Generic을 Angular에서 어떻게 활용하나요?'
        ],
        tags: ['typescript', 'decorators', 'basics', 'metadata']
      },
      {
        id: 'angular-component-module-service',
        topic: '컴포넌트, 모듈, 서비스',
        description: 'Angular의 핵심 빌딩 블록',
        sampleQuestions: [
          '컴포넌트, 모듈, 서비스의 역할을 설명해주세요',
          '@Input과 @Output은 어떻게 사용하나요?',
          'ngOnInit과 constructor의 차이는?'
        ],
        keyConceptsToProbe: [
          '컴포넌트는 UI, 모듈은 기능 그룹화, 서비스는 비즈니스 로직',
          '@Input으로 부모→자식 데이터, @Output+EventEmitter로 자식→부모',
          'constructor는 DI 초기화, ngOnInit은 Angular 라이프사이클 시작점'
        ],
        followUpAngles: [
          'OnPush 변경 감지 전략은 무엇인가요?',
          'ViewChild와 ContentChild의 차이는?',
          'ngOnChanges는 언제 호출되나요?'
        ],
        tags: ['components', 'modules', 'services', 'lifecycle']
      },
      {
        id: 'angular-dependency-injection',
        topic: '의존성 주입 기초',
        description: 'DI 컨테이너와 서비스',
        sampleQuestions: [
          'Angular의 의존성 주입은 어떻게 동작하나요?',
          'providedIn: "root"는 무엇을 의미하나요?',
          'Injection Token은 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'DI는 싱글톤 서비스 제공, Injector 계층 구조',
          '"root"는 애플리케이션 전역 싱글톤',
          'InjectionToken은 non-class 의존성 주입 (설정값, 인터페이스)'
        ],
        followUpAngles: [
          'providedIn vs providers 배열의 차이는?',
          'Optional, Self, SkipSelf 데코레이터는?',
          'Multi Provider는 무엇인가요?'
        ],
        tags: ['di', 'injection', 'providers', 'services']
      }
    ],
    mid: [
      {
        id: 'angular-rxjs-observables',
        topic: 'RxJS와 Observable 패턴',
        description: '반응형 프로그래밍',
        sampleQuestions: [
          'Observable과 Promise의 차이는 무엇인가요?',
          'Operator (map, filter, switchMap)를 어떻게 사용하나요?',
          'Memory Leak을 방지하는 방법은?'
        ],
        keyConceptsToProbe: [
          'Observable은 다중 값, 지연 실행, 취소 가능; Promise는 단일 값',
          'pipe()로 operator 체인, switchMap은 이전 구독 취소',
          'unsubscribe(), async pipe, takeUntil()로 구독 관리'
        ],
        followUpAngles: [
          'Hot Observable vs Cold Observable?',
          'Subject, BehaviorSubject, ReplaySubject의 차이는?',
          'combineLatest와 forkJoin의 차이는?'
        ],
        tags: ['rxjs', 'observables', 'reactive', 'operators']
      },
      {
        id: 'angular-change-detection',
        topic: '변경 감지 전략',
        description: '성능 최적화',
        sampleQuestions: [
          'Angular의 변경 감지는 어떻게 동작하나요?',
          'OnPush 전략은 언제 사용하나요?',
          'Zone.js는 무엇이며 왜 필요한가요?'
        ],
        keyConceptsToProbe: [
          '기본 전략은 모든 컴포넌트 체크, OnPush는 Input/Event 변경 시만',
          'Immutable 데이터, 이벤트 적은 컴포넌트에 OnPush 사용',
          'Zone.js는 비동기 작업 감지, 자동 변경 감지 트리거'
        ],
        followUpAngles: [
          'ChangeDetectorRef.detectChanges()는 언제 사용하나요?',
          'markForCheck()와 detectChanges()의 차이는?',
          'Zoneless Angular는 무엇인가요?'
        ],
        tags: ['change-detection', 'onpush', 'zone', 'performance']
      },
      {
        id: 'angular-routing-advanced',
        topic: '라우팅 고급 (Lazy Loading, Guard)',
        description: '코드 분할과 보안',
        sampleQuestions: [
          'Lazy Loading은 어떻게 구현하나요?',
          'Route Guard (CanActivate, CanLoad)의 차이는?',
          'Resolver는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'loadChildren으로 모듈 지연 로딩, 초기 번들 크기 감소',
          'CanActivate는 라우트 활성화, CanLoad는 모듈 로드 방지',
          'Resolver는 라우팅 전 데이터 프리로드'
        ],
        followUpAngles: [
          'Preloading Strategy는 무엇인가요?',
          'CanDeactivate는 어떻게 사용하나요?',
          'Standalone Components에서 라우팅은?'
        ],
        tags: ['routing', 'lazy-loading', 'guards', 'code-splitting']
      }
    ],
    senior: [
      {
        id: 'angular-architecture-patterns',
        topic: 'Angular 아키텍처 패턴 (NGRX, Akita)',
        description: '상태 관리 라이브러리',
        sampleQuestions: [
          'NGRX의 Redux 패턴을 설명해주세요',
          'Effect와 Reducer의 역할은?',
          'Akita와 NGRX의 차이는?'
        ],
        keyConceptsToProbe: [
          'NGRX는 단방향 데이터 흐름, Action-Reducer-Store-Selector',
          'Reducer는 순수 함수로 상태 변경, Effect는 사이드 이펙트 처리',
          'Akita는 OOP 스타일, boilerplate 적음, 학습 곡선 낮음'
        ],
        followUpAngles: [
          'Entity Adapter는 무엇인가요?',
          'Component Store는 언제 사용하나요?',
          'NGRX Signal Store는 무엇인가요?'
        ],
        tags: ['ngrx', 'akita', 'state-management', 'redux']
      },
      {
        id: 'angular-enterprise',
        topic: '대규모 엔터프라이즈 앱',
        description: '모노레포와 설계 패턴',
        sampleQuestions: [
          'Nx를 사용한 Angular 모노레포 경험은?',
          'Library와 App을 어떻게 구분하나요?',
          'Micro Frontend를 Angular로 구현한 경험은?'
        ],
        keyConceptsToProbe: [
          'Nx는 모노레포 도구, 의존성 그래프, 캐싱, 병렬 빌드',
          'Library는 재사용 가능한 기능, App은 배포 가능한 애플리케이션',
          'Module Federation으로 독립 배포, 런타임 통합'
        ],
        followUpAngles: [
          'Feature Shell 패턴은 무엇인가요?',
          'Core/Shared/Feature 모듈 구조는?',
          'Design System을 라이브러리로 관리한 경험은?'
        ],
        tags: ['enterprise', 'monorepo', 'nx', 'microfrontend']
      },
      {
        id: 'angular-microfrontend',
        topic: '마이크로 프론트엔드',
        description: '독립 배포와 통합',
        sampleQuestions: [
          'Module Federation을 Angular에서 어떻게 사용하나요?',
          '여러 Angular 버전을 하나의 앱에서 실행한 경험은?',
          'Micro Frontend 간 상태 공유는 어떻게 하나요?'
        ],
        keyConceptsToProbe: [
          '@angular-architects/module-federation으로 설정, remote/host 구조',
          'Version Mismatch 회피, Wrapper/Adapter 패턴',
          'Custom Events, SharedStore, Browser Storage 활용'
        ],
        followUpAngles: [
          'Single-SPA vs Module Federation?',
          'Micro Frontend의 장단점은?',
          'E2E 테스트는 어떻게 하나요?'
        ],
        tags: ['microfrontend', 'module-federation', 'architecture', 'scaling']
      }
    ]
  },
  commonMistakes: [
    'subscribe()만 하고 unsubscribe() 생략 (메모리 누수)',
    'ngFor에서 trackBy 함수 미사용 (성능 저하)',
    'OnPush 전략에서 mutable 객체 변경 (감지 안 됨)',
    'HttpClient를 여러 번 subscribe (중복 요청)'
  ],
  bestPractices: [
    'async pipe로 자동 구독 관리',
    'OnPush 변경 감지로 성능 최적화',
    'Standalone Components로 모듈 의존성 감소',
    'Smart/Dumb Component 패턴',
    'RxJS Operator로 선언적 코드'
  ],
  relatedTechnologies: ['typescript', 'rxjs', 'ngrx', 'nx', 'jest']
};

export default angularKnowledge;
