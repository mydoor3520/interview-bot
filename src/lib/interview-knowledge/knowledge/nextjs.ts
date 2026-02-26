import type { TechKnowledgeBase } from '../types';

const nextjsKnowledge: TechKnowledgeBase = {
  techId: 'nextjs',
  displayName: 'Next.js',
  category: 'frontend',
  version: '14+',
  topics: {
    junior: [
      {
        id: 'nextjs-routing',
        topic: '라우팅 시스템 (App Router)',
        description: '파일 기반 라우팅',
        sampleQuestions: [
          'App Router와 Pages Router의 차이는 무엇인가요?',
          'Dynamic Route는 어떻게 만드나요?',
          'Route Group은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'App Router는 React Server Components 지원, layout/template 기능',
          '[id] 폴더로 동적 경로, params prop으로 접근',
          '(group) 폴더는 URL에 포함 안 됨, layout 공유'
        ],
        followUpAngles: [
          'Parallel Routes와 Intercepting Routes는?',
          'loading.tsx와 error.tsx의 역할은?',
          'Route Handlers (route.ts)는 무엇인가요?'
        ],
        tags: ['routing', 'app-router', 'dynamic-routes', 'file-based']
      },
      {
        id: 'nextjs-rendering-modes',
        topic: 'SSR, SSG, ISR 기초',
        description: '렌더링 전략',
        sampleQuestions: [
          'SSR, SSG, ISR의 차이는 무엇인가요?',
          'Server Components와 Client Components의 차이는?',
          '"use client" 디렉티브는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'SSR은 요청마다 생성, SSG는 빌드 시 생성, ISR은 재생성 주기',
          'Server Components는 서버 실행, 번들 제외; Client는 상호작용',
          '"use client"는 상태, 이벤트 핸들러, 브라우저 API 사용 시'
        ],
        followUpAngles: [
          'generateStaticParams는 무엇인가요?',
          'Streaming SSR은 무엇인가요?',
          'revalidatePath와 revalidateTag는?'
        ],
        tags: ['ssr', 'ssg', 'isr', 'server-components']
      },
      {
        id: 'nextjs-data-fetching',
        topic: '데이터 페칭 (Server Components)',
        description: '서버 사이드 데이터 로드',
        sampleQuestions: [
          'Server Component에서 async/await로 데이터를 가져오는 방법은?',
          'fetch API의 캐싱 옵션은 무엇인가요?',
          'Client Component에서는 어떻게 데이터를 가져오나요?'
        ],
        keyConceptsToProbe: [
          'Server Component에서 직접 async 함수, DB/API 직접 호출',
          'fetch() cache 옵션: force-cache(기본), no-store, revalidate',
          'Client는 useEffect + fetch 또는 SWR/React Query'
        ],
        followUpAngles: [
          'Server Actions는 무엇인가요?',
          'Sequential vs Parallel Data Fetching?',
          'Suspense와 함께 사용하는 방법은?'
        ],
        tags: ['data-fetching', 'server-components', 'fetch', 'caching']
      }
    ],
    mid: [
      {
        id: 'nextjs-caching',
        topic: '캐싱 전략',
        description: 'Request, Data, Full Route Cache',
        sampleQuestions: [
          'Next.js의 4가지 캐싱 레이어를 설명해주세요',
          'fetch 캐시를 무효화하는 방법은?',
          'unstable_cache는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'Request Memoization, Data Cache, Full Route Cache, Router Cache',
          'revalidatePath(), revalidateTag(), cache: "no-store"',
          'unstable_cache는 React Query처럼 캐싱, tag 기반 무효화'
        ],
        followUpAngles: [
          'On-Demand Revalidation은 어떻게 구현하나요?',
          'Time-based Revalidation (ISR)과 On-Demand의 차이는?',
          'CDN 캐싱과 Next.js 캐싱의 관계는?'
        ],
        tags: ['caching', 'revalidation', 'isr', 'performance']
      },
      {
        id: 'nextjs-middleware-api',
        topic: '미들웨어와 API Routes',
        description: '서버 사이드 로직',
        sampleQuestions: [
          'Next.js 미들웨어는 언제 사용하나요?',
          'Route Handlers와 API Routes의 차이는?',
          'Edge Runtime과 Node.js Runtime의 차이는?'
        ],
        keyConceptsToProbe: [
          '미들웨어는 인증, 리다이렉트, 헤더 조작 (요청 전 실행)',
          'Route Handlers는 App Router의 API 엔드포인트 (route.ts)',
          'Edge는 전역 배포, 빠른 응답, 제한된 API; Node는 full API'
        ],
        followUpAngles: [
          'middleware.ts의 matcher 설정은?',
          'Server Actions vs Route Handlers?',
          'NextRequest/NextResponse의 특징은?'
        ],
        tags: ['middleware', 'api-routes', 'edge', 'server-side']
      },
      {
        id: 'nextjs-optimization',
        topic: '이미지, 폰트, 스크립트 최적화',
        description: 'Built-in 최적화 기능',
        sampleQuestions: [
          'next/image의 최적화 기능을 설명해주세요',
          'next/font는 어떻게 폰트를 최적화하나요?',
          'next/script의 strategy 옵션은?'
        ],
        keyConceptsToProbe: [
          'next/image는 자동 WebP, 리사이징, lazy loading, placeholder',
          'next/font는 폰트 파일 자체 호스팅, FOUT 방지, CSS 변수',
          'strategy: beforeInteractive/afterInteractive/lazyOnload/worker'
        ],
        followUpAngles: [
          'Image의 sizes와 priority 속성은?',
          'Variable Fonts는 어떻게 사용하나요?',
          'Third-party Script 최적화 방법은?'
        ],
        tags: ['optimization', 'images', 'fonts', 'performance']
      }
    ],
    senior: [
      {
        id: 'nextjs-large-scale-architecture',
        topic: '대규모 Next.js 아키텍처',
        description: '모노레포와 프로젝트 구조',
        sampleQuestions: [
          '대규모 Next.js 앱의 폴더 구조를 어떻게 설계하나요?',
          'Turborepo를 사용한 경험은?',
          'Server Components와 Client Components를 어떻게 분리하나요?'
        ],
        keyConceptsToProbe: [
          'Feature-based 구조, app 디렉토리 + lib/components/utils 분리',
          'Turborepo로 캐싱, 증분 빌드, 병렬 작업',
          'Server는 데이터 레이어, Client는 상호작용 레이어'
        ],
        followUpAngles: [
          'Module Path Alias (@/*) 설정은?',
          'Design System을 패키지로 분리한 경험은?',
          'Micro Frontend를 Next.js로 구현한 경험은?'
        ],
        tags: ['architecture', 'monorepo', 'turborepo', 'scaling']
      },
      {
        id: 'nextjs-edge-serverless',
        topic: 'Edge Runtime과 서버리스',
        description: 'Vercel Edge, AWS Lambda',
        sampleQuestions: [
          'Edge Runtime의 장단점은 무엇인가요?',
          'Next.js를 AWS Lambda에 배포한 경험은?',
          'Cold Start를 최적화하는 방법은?'
        ],
        keyConceptsToProbe: [
          'Edge는 전역 분산, 낮은 지연, 제한된 Node API',
          'Serverless Adapter (SST, Terraform), Output: standalone',
          '번들 크기 감소, Code Splitting, 워밍 전략'
        ],
        followUpAngles: [
          'Incremental Static Regeneration in Serverless?',
          'Edge Config와 KV Storage는?',
          'Self-Hosting vs Vercel의 차이는?'
        ],
        tags: ['edge', 'serverless', 'deployment', 'lambda']
      },
      {
        id: 'nextjs-performance-production',
        topic: '성능 최적화 (Streaming SSR)',
        description: '실전 성능 개선',
        sampleQuestions: [
          'Streaming SSR은 어떻게 구현하나요?',
          'TTFB, FCP, LCP를 개선한 경험은?',
          'Partial Prerendering (PPR)은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'Suspense로 컴포넌트 단위 streaming, loading.tsx 활용',
          'CDN, Edge Caching, 이미지 최적화, Code Splitting',
          'PPR은 정적 부분은 캐싱, 동적 부분은 streaming (실험적)'
        ],
        followUpAngles: [
          'Selective Hydration은 무엇인가요?',
          'Bundle Analyzer로 분석한 경험은?',
          'React Compiler와 Next.js 통합은?'
        ],
        tags: ['performance', 'streaming', 'ssr', 'web-vitals']
      }
    ]
  },
  commonMistakes: [
    'Server Component에서 useState/useEffect 사용 시도',
    'Client Component를 Server Component에 props로 전달 (불가능)',
    'fetch() 캐싱 이해 부족으로 불필요한 요청',
    'Image 컴포넌트 width/height 생략 (Layout Shift)'
  ],
  bestPractices: [
    'Server Components 우선, 필요 시에만 "use client"',
    'Suspense + Streaming으로 UX 개선',
    'Route Handlers로 API 엔드포인트 구현',
    'next/image, next/font로 자동 최적화',
    'TypeScript + Zod로 타입 안전성'
  ],
  relatedTechnologies: ['react', 'typescript', 'vercel', 'turborepo', 'tailwind']
};

export default nextjsKnowledge;
