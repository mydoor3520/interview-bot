import type { TechKnowledgeBase } from '../types';

const vueKnowledge: TechKnowledgeBase = {
  techId: 'vue',
  displayName: 'Vue.js',
  category: 'frontend',
  version: '3+',
  topics: {
    junior: [
      {
        id: 'vue-reactivity-basics',
        topic: '반응성 시스템 기초',
        description: 'Vue의 반응성 시스템과 템플릿 문법 이해',
        sampleQuestions: [
          'Vue의 반응성 시스템은 어떻게 동작하나요?',
          'ref와 reactive의 차이는 무엇인가요?',
          'v-model 디렉티브는 어떻게 동작하나요?'
        ],
        keyConceptsToProbe: [
          'Vue 3는 Proxy 기반 반응성, getter/setter로 의존성 추적',
          'ref는 원시값용 (value로 접근), reactive는 객체용',
          'v-model은 :value와 @input의 syntactic sugar'
        ],
        followUpAngles: [
          'computed와 watch의 차이는?',
          'toRef와 toRefs는 언제 사용하나요?',
          'setup() 함수에서 반응성을 잃는 경우는?'
        ],
        tags: ['reactivity', 'ref', 'reactive', 'basics']
      },
      {
        id: 'vue-component-basics',
        topic: '컴포넌트 기초 (Props, Events)',
        description: '부모-자식 컴포넌트 통신',
        sampleQuestions: [
          'Props와 Emit으로 데이터를 주고받는 방법을 설명해주세요',
          'defineProps와 defineEmits는 무엇인가요?',
          'Slot은 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'Props는 단방향 데이터 흐름, Emit으로 이벤트 발생',
          'defineProps/defineEmits는 Composition API의 컴파일러 매크로',
          'Slot은 컴포넌트 콘텐츠 삽입 지점 정의'
        ],
        followUpAngles: [
          'Props 유효성 검사는 어떻게 하나요?',
          'Named Slot과 Scoped Slot의 차이는?',
          'provide/inject는 언제 사용하나요?'
        ],
        tags: ['components', 'props', 'events', 'slots']
      },
      {
        id: 'vue-router-basics',
        topic: 'Vue Router 기본',
        description: 'SPA 라우팅 구현',
        sampleQuestions: [
          'Vue Router의 라우팅 모드 (history, hash)의 차이는?',
          'Dynamic Route Matching은 어떻게 구현하나요?',
          'Nested Routes는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'history 모드는 깔끔한 URL, 서버 설정 필요; hash 모드는 # 사용',
          'Route path에 :id 같은 params 정의, $route.params로 접근',
          'Nested Routes는 부모-자식 레이아웃 구조'
        ],
        followUpAngles: [
          'RouterLink와 일반 <a> 태그의 차이는?',
          'Navigation Guards는 무엇인가요?',
          'Route meta fields는 어떻게 활용하나요?'
        ],
        tags: ['vue-router', 'routing', 'spa', 'navigation']
      }
    ],
    mid: [
      {
        id: 'vue-composition-vs-options',
        topic: 'Composition API vs Options API',
        description: 'API 스타일 선택과 마이그레이션',
        sampleQuestions: [
          'Composition API와 Options API의 차이는 무엇인가요?',
          'Composition API를 사용하는 이유는?',
          'Options API를 Composition API로 전환한 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          'Options API는 옵션별 구조, Composition API는 로직별 구조',
          '코드 재사용성, 타입 추론, 로직 그룹화 개선',
          'setup() 함수에서 반응성 API와 라이프사이클 훅 사용'
        ],
        followUpAngles: [
          'script setup 문법의 장점은?',
          'Composables (재사용 가능한 로직)는 어떻게 만드나요?',
          '두 API를 혼용할 수 있나요?'
        ],
        tags: ['composition-api', 'options-api', 'setup', 'migration']
      },
      {
        id: 'vue-state-management',
        topic: '상태 관리 (Pinia, Vuex)',
        description: '전역 상태 관리 패턴',
        sampleQuestions: [
          'Pinia와 Vuex의 차이는 무엇인가요?',
          'Pinia Store를 어떻게 정의하고 사용하나요?',
          'Store를 언제 모듈로 분리해야 하나요?'
        ],
        keyConceptsToProbe: [
          'Pinia는 Vue 3 공식 추천, TypeScript 지원 우수, mutations 없음',
          'defineStore로 정의, state/getters/actions 구성',
          '도메인별, 기능별로 Store 분리, $patch로 일괄 업데이트'
        ],
        followUpAngles: [
          'Pinia의 플러그인 시스템은 어떻게 사용하나요?',
          'Store 간의 의존성은 어떻게 관리하나요?',
          'Composition Stores vs Options Stores?'
        ],
        tags: ['pinia', 'vuex', 'state-management', 'store']
      },
      {
        id: 'vue-rendering-optimization',
        topic: '렌더링 최적화',
        description: '성능 개선 기법',
        sampleQuestions: [
          'Vue에서 불필요한 리렌더링을 방지하는 방법은?',
          'v-show와 v-if의 차이는 무엇인가요?',
          'KeepAlive 컴포넌트는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'computed 캐싱, shallowRef/shallowReactive, v-memo',
          'v-show는 CSS display, v-if는 DOM 제거/추가',
          'KeepAlive는 컴포넌트 상태 보존 (탭, 모달 등)'
        ],
        followUpAngles: [
          'Virtual Scrolling은 어떻게 구현하나요?',
          'Teleport 컴포넌트는 무엇인가요?',
          'Async Components와 Lazy Loading은?'
        ],
        tags: ['optimization', 'performance', 'rendering', 'keepalive']
      }
    ],
    senior: [
      {
        id: 'vue-architecture',
        topic: 'Vue 3 아키텍처 (Proxy 기반 반응성)',
        description: '내부 동작 원리와 설계',
        sampleQuestions: [
          'Vue 3의 Proxy 기반 반응성이 Vue 2와 어떻게 다른가요?',
          'Reactivity Transform (ref sugar)은 무엇인가요?',
          'effectScope는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'Vue 2는 Object.defineProperty, Vue 3는 Proxy (배열/Map 지원)',
          'Reactivity Transform은 .value 없이 ref 사용 (실험적)',
          'effectScope로 effect 생명주기 관리, 메모리 누수 방지'
        ],
        followUpAngles: [
          'triggerRef와 shallowReactive의 사용 사례는?',
          'Custom Ref (customRef)는 어떻게 만드나요?',
          'Vue의 Compiler는 어떻게 최적화하나요?'
        ],
        tags: ['architecture', 'proxy', 'reactivity', 'compiler']
      },
      {
        id: 'vue-large-scale-architecture',
        topic: '대규모 Vue 프로젝트 설계',
        description: '확장 가능한 아키텍처',
        sampleQuestions: [
          '대규모 Vue 앱의 폴더 구조를 어떻게 설계하나요?',
          'Feature Module 패턴을 적용한 경험이 있나요?',
          'Micro Frontend를 Vue로 구현한 경험은?'
        ],
        keyConceptsToProbe: [
          'Feature-based 구조, 도메인 계층 분리',
          'Store/Router/Components를 Feature별로 모듈화',
          'Module Federation, Single-SPA로 독립 배포'
        ],
        followUpAngles: [
          'Monorepo (Nx, Turborepo)를 사용한 경험은?',
          'Design System을 별도 패키지로 관리한 경험은?',
          'Plugin 시스템을 설계한 경험은?'
        ],
        tags: ['architecture', 'large-scale', 'monorepo', 'microfrontend']
      },
      {
        id: 'vue-ssr-nuxt',
        topic: 'SSR과 Nuxt.js',
        description: '서버 사이드 렌더링',
        sampleQuestions: [
          'Vue SSR의 동작 원리를 설명해주세요',
          'Nuxt.js를 사용하는 이유는?',
          'Hydration Mismatch를 어떻게 해결하나요?'
        ],
        keyConceptsToProbe: [
          'SSR은 서버에서 HTML 생성, 클라이언트에서 Hydration',
          'Nuxt는 SSR/SSG/Hybrid 지원, 파일 기반 라우팅, 자동 코드 분할',
          'useLazyAsyncData, ClientOnly 컴포넌트로 해결'
        ],
        followUpAngles: [
          'Nuxt 3의 Nitro 서버는 무엇인가요?',
          'Universal Rendering vs Hybrid Rendering?',
          'Edge Side Rendering 경험은?'
        ],
        tags: ['ssr', 'nuxt', 'hydration', 'rendering']
      }
    ]
  },
  commonMistakes: [
    'ref를 템플릿에서 .value로 접근 (템플릿에서는 자동 unwrap)',
    'reactive 객체를 구조 분해하면 반응성 상실 (toRefs 사용)',
    'setup()에서 비동기로 데이터 반환 (Suspense 없이는 불가)',
    'v-for와 v-if를 같은 엘리먼트에 사용 (computed로 필터링 권장)'
  ],
  bestPractices: [
    'Composition API + script setup으로 간결한 코드',
    'Composables로 로직 재사용 (useXxx 네이밍)',
    'Pinia로 타입 안전한 상태 관리',
    'defineProps/defineEmits로 타입 추론',
    'shallowRef/shallowReactive로 대량 데이터 최적화'
  ],
  relatedTechnologies: ['nuxt', 'pinia', 'typescript', 'vite', 'tailwind']
};

export default vueKnowledge;
