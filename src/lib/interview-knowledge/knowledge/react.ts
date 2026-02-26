import type { TechKnowledgeBase } from '../types';

const reactKnowledge: TechKnowledgeBase = {
  techId: 'react',
  displayName: 'React',
  category: 'frontend',
  version: '18+',
  topics: {
    junior: [
      {
        id: 'react-jsx-basics',
        topic: 'JSX와 Virtual DOM',
        description: 'JSX 문법과 Virtual DOM의 동작 원리 이해',
        sampleQuestions: [
          'JSX가 무엇이며, 왜 React에서 사용하나요?',
          'Virtual DOM이 실제 DOM보다 빠른 이유는 무엇인가요?',
          'React에서 key prop이 왜 중요한가요?'
        ],
        keyConceptsToProbe: [
          'JSX는 JavaScript 문법 확장, Babel이 React.createElement로 변환',
          'Virtual DOM은 메모리상의 DOM 표현, diffing 알고리즘으로 최소 변경',
          'key prop은 리스트 렌더링 시 재조정(reconciliation) 최적화'
        ],
        followUpAngles: [
          'key로 index를 사용하면 안 되는 경우는?',
          'React.Fragment를 사용하는 이유는?',
          'className 대신 class를 사용하면 어떻게 되나요?'
        ],
        tags: ['jsx', 'virtual-dom', 'reconciliation', 'basics']
      },
      {
        id: 'react-hooks-basics',
        topic: 'Hooks 기초 (useState, useEffect)',
        description: '상태 관리와 사이드 이펙트 처리',
        sampleQuestions: [
          'useState와 useEffect의 역할을 설명해주세요',
          'useEffect의 dependency array는 무엇이며 왜 필요한가요?',
          '클래스 컴포넌트 대신 함수 컴포넌트와 Hooks를 사용하는 이유는?'
        ],
        keyConceptsToProbe: [
          'useState는 컴포넌트 상태 관리, 리렌더링 트리거',
          'useEffect는 사이드 이펙트 처리, cleanup function',
          'dependency array로 실행 조건 제어, 빈 배열은 mount 시 1회'
        ],
        followUpAngles: [
          'setState가 비동기로 동작하는 이유는?',
          'useEffect cleanup function은 언제 실행되나요?',
          'dependency array에 함수나 객체를 넣으면 어떻게 되나요?'
        ],
        tags: ['hooks', 'useState', 'useEffect', 'lifecycle']
      },
      {
        id: 'react-component-patterns',
        topic: '컴포넌트 설계 패턴',
        description: '재사용 가능한 컴포넌트 구조',
        sampleQuestions: [
          'Presentational Component와 Container Component의 차이는?',
          'props drilling 문제를 어떻게 해결하나요?',
          '컴포넌트를 언제 분리해야 하나요?'
        ],
        keyConceptsToProbe: [
          'Presentational은 UI만, Container는 로직 담당',
          'Context API, composition pattern으로 props drilling 해결',
          '단일 책임 원칙, 재사용성, 가독성 기준으로 분리'
        ],
        followUpAngles: [
          'children prop을 활용한 composition pattern은?',
          'HOC(Higher-Order Component)와 Custom Hook의 차이는?',
          'Controlled vs Uncontrolled Component는?'
        ],
        tags: ['component-design', 'composition', 'props', 'patterns']
      }
    ],
    mid: [
      {
        id: 'react-rendering-optimization',
        topic: '렌더링 최적화 (memo, useMemo, useCallback)',
        description: '불필요한 리렌더링 방지',
        sampleQuestions: [
          'React.memo, useMemo, useCallback의 차이와 사용 시점은?',
          '리렌더링이 발생하는 조건은 무엇인가요?',
          '성능 최적화를 위해 어떤 도구를 사용해보셨나요?'
        ],
        keyConceptsToProbe: [
          'React.memo는 컴포넌트 메모이제이션, useMemo는 값, useCallback은 함수',
          '부모 리렌더링, props 변경, state 변경, Context 변경 시 리렌더링',
          'React DevTools Profiler, Chrome Performance tab'
        ],
        followUpAngles: [
          '모든 컴포넌트에 React.memo를 쓰면 안 되는 이유는?',
          'stale closure 문제는 무엇이고 어떻게 해결하나요?',
          'useMemo의 dependency array를 생략하면?'
        ],
        tags: ['optimization', 'memoization', 'performance', 'rendering']
      },
      {
        id: 'react-state-management',
        topic: '상태 관리 아키텍처',
        description: '전역 상태와 서버 상태 관리',
        sampleQuestions: [
          'Context API와 Redux의 차이는 무엇인가요?',
          'React Query나 SWR을 사용하는 이유는?',
          '상태를 언제 전역으로 관리해야 하나요?'
        ],
        keyConceptsToProbe: [
          'Context는 내장 API, Redux는 예측 가능한 상태 컨테이너',
          'React Query/SWR은 서버 상태 전용, 캐싱/동기화/자동 리페치',
          '여러 컴포넌트에서 공유, 지속성 필요, 복잡한 로직 분리 시'
        ],
        followUpAngles: [
          'useReducer vs useState 선택 기준은?',
          'Zustand, Jotai 같은 atomic state 라이브러리의 장점은?',
          'Server State와 Client State를 어떻게 분리하나요?'
        ],
        tags: ['state-management', 'context', 'redux', 'react-query']
      },
      {
        id: 'react-testing-strategy',
        topic: 'React 테스팅 전략',
        description: '컴포넌트와 훅 테스트',
        sampleQuestions: [
          'React Testing Library와 Enzyme의 차이는?',
          '비동기 로직을 어떻게 테스트하나요?',
          'Custom Hook을 테스트하는 방법은?'
        ],
        keyConceptsToProbe: [
          'RTL은 사용자 중심 테스트, Enzyme은 구현 세부사항',
          'waitFor, findBy 쿼리, MSW로 API 모킹',
          'renderHook 유틸리티 사용'
        ],
        followUpAngles: [
          'getByRole과 getByTestId 중 어느 것을 선호하나요?',
          'E2E 테스트와 단위 테스트의 범위는 어떻게 나누나요?',
          'Snapshot 테스트의 장단점은?'
        ],
        tags: ['testing', 'rtl', 'jest', 'e2e']
      }
    ],
    senior: [
      {
        id: 'react-concurrent-rsc',
        topic: 'Concurrent React & Server Components',
        description: 'React 18+ 최신 기능',
        sampleQuestions: [
          'Concurrent Rendering이 무엇이며 어떤 문제를 해결하나요?',
          'Server Component와 Client Component의 차이는?',
          'Suspense와 Streaming SSR의 동작 원리는?'
        ],
        keyConceptsToProbe: [
          'Concurrent는 렌더링 중단/재개 가능, 우선순위 처리',
          'Server Component는 서버에서만 실행, 번들 크기 감소',
          'Suspense는 비동기 경계, Streaming으로 점진적 렌더링'
        ],
        followUpAngles: [
          'useTransition과 useDeferredValue의 차이는?',
          'Server Component에서 상태를 사용할 수 없는 이유는?',
          'Selective Hydration이란?'
        ],
        tags: ['concurrent', 'rsc', 'suspense', 'streaming', 'react18']
      },
      {
        id: 'react-architecture',
        topic: '대규모 React 아키텍처',
        description: '모노레포, 코드 분할, 확장성',
        sampleQuestions: [
          '대규모 React 앱의 폴더 구조를 어떻게 설계하나요?',
          '코드 분할 전략은 무엇인가요?',
          '마이크로 프론트엔드 아키텍처 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          'Feature-based vs Layer-based 구조, 모듈 경계 명확화',
          'React.lazy, dynamic import, route-based splitting',
          'Module Federation, Single-SPA 등'
        ],
        followUpAngles: [
          'Barrel export의 장단점은?',
          'Circular dependency를 어떻게 방지하나요?',
          'Design System을 별도 패키지로 분리한 경험은?'
        ],
        tags: ['architecture', 'monorepo', 'code-splitting', 'microfrontend']
      },
      {
        id: 'react-large-scale-performance',
        topic: '대규모 서비스 성능 최적화',
        description: '실제 프로덕션 성능 개선 경험',
        sampleQuestions: [
          '실제로 성능 문제를 발견하고 해결한 경험을 말씀해주세요',
          'LCP, FID, CLS 같은 Core Web Vitals를 개선한 경험은?',
          '수만 개의 아이템을 렌더링해야 할 때 어떻게 최적화하나요?'
        ],
        keyConceptsToProbe: [
          'Lighthouse, Performance API, RUM 도구 활용',
          'Image optimization, lazy loading, prefetching',
          'Virtual scrolling (react-window), pagination, infinite scroll'
        ],
        followUpAngles: [
          'Bundle 크기를 줄이기 위해 어떤 방법을 사용했나요?',
          'Hydration 시간을 단축하는 방법은?',
          '메모리 누수를 진단하고 수정한 경험은?'
        ],
        tags: ['performance', 'web-vitals', 'optimization', 'production']
      }
    ]
  },
  commonMistakes: [
    'Stale closure: useEffect/useCallback dependency 누락으로 이전 값 참조',
    'key prop으로 배열 index 사용 (순서 변경 시 버그)',
    'Context 변경 시 모든 Consumer 리렌더링 (value를 매번 새 객체로 생성)',
    'inline object/function을 props로 전달 (매 렌더링마다 새 참조)'
  ],
  bestPractices: [
    'Composition pattern으로 재사용성 높이기 (children prop 활용)',
    'Server State와 Client State 분리 (React Query + Zustand)',
    'Error Boundary로 에러 처리',
    'Custom Hooks로 로직 재사용',
    'TypeScript로 타입 안전성 확보'
  ],
  relatedTechnologies: ['next.js', 'typescript', 'redux', 'react-query', 'tailwind']
};

export default reactKnowledge;
