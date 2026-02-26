import type { TechKnowledgeBase } from '../types';

const typescriptKnowledge: TechKnowledgeBase = {
  techId: 'typescript',
  displayName: 'TypeScript',
  category: 'language',
  version: '5.x',
  topics: {
    junior: [
      {
        id: 'typescript-type-basics',
        topic: '타입 기초 (interface vs type)',
        description: '타입 정의 방법',
        sampleQuestions: [
          'interface와 type의 차이는 무엇인가요?',
          'type assertion과 type casting의 차이는?',
          'union type과 intersection type을 설명해주세요'
        ],
        keyConceptsToProbe: [
          'interface는 확장 가능 (declaration merging), type은 union/intersection 표현력',
          'assertion은 컴파일 타임 힌트 (as), casting은 런타임 변환 (없음)',
          'union은 OR (A | B), intersection은 AND (A & B)'
        ],
        followUpAngles: [
          'interface를 extends vs type을 &로 확장의 차이는?',
          'type assertion을 남발하면 위험한 이유는?',
          'readonly와 const의 차이는?'
        ],
        tags: ['types', 'interface', 'union', 'intersection']
      },
      {
        id: 'typescript-generics-basics',
        topic: '제네릭 기초',
        description: '재사용 가능한 타입',
        sampleQuestions: [
          '제네릭을 사용하는 이유는 무엇인가요?',
          'Array<T>와 T[]의 차이는?',
          '제네릭 제약 조건 (extends)은 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          '제네릭은 타입을 파라미터화하여 재사용성 향상',
          'Array<T>와 T[]는 동일, Array<T>가 명시적',
          'extends로 타입 제약 (T extends string)'
        ],
        followUpAngles: [
          'default generic parameter는 언제 사용하나요?',
          '여러 제네릭 파라미터를 사용하는 예시는?',
          'keyof와 제네릭을 함께 사용하는 패턴은?'
        ],
        tags: ['generics', 'constraints', 'reusability']
      },
      {
        id: 'typescript-type-guard',
        topic: '타입 가드/내로잉',
        description: '런타임 타입 안전성',
        sampleQuestions: [
          '타입 가드는 무엇이며 왜 필요한가요?',
          'typeof와 instanceof의 차이는?',
          'user-defined type guard는 어떻게 작성하나요?'
        ],
        keyConceptsToProbe: [
          '타입 가드는 런타임에 타입 좁히기 (narrowing)',
          'typeof는 원시 타입, instanceof는 클래스 인스턴스',
          'function isType(x: unknown): x is Type { ... } 형태'
        ],
        followUpAngles: [
          'discriminated union을 설명해주세요',
          'in 연산자로 타입 가드하는 방법은?',
          'null/undefined 체크 방법은?'
        ],
        tags: ['type-guard', 'narrowing', 'runtime-safety']
      }
    ],
    mid: [
      {
        id: 'typescript-advanced-types',
        topic: '고급 타입 (conditional, mapped, template literal)',
        description: '타입 수준 프로그래밍',
        sampleQuestions: [
          'conditional type (T extends U ? X : Y)을 설명해주세요',
          'mapped type은 어떻게 사용하나요?',
          'template literal type의 활용 예시는?'
        ],
        keyConceptsToProbe: [
          'conditional type은 타입 조건부 분기',
          'mapped type은 기존 타입을 변환 ({ [K in keyof T]: ... })',
          'template literal type은 문자열 패턴 타입 (\`prefix-${string}\`)'
        ],
        followUpAngles: [
          'infer 키워드는 어떻게 사용하나요?',
          'Partial, Required, Pick, Omit을 직접 구현한다면?',
          'utility types를 조합한 복잡한 타입 예시는?'
        ],
        tags: ['conditional', 'mapped', 'template-literal', 'utility-types']
      },
      {
        id: 'typescript-module-system',
        topic: '모듈 시스템/declaration',
        description: '타입 정의 파일 관리',
        sampleQuestions: [
          '.d.ts 파일은 무엇이며 언제 사용하나요?',
          'declare 키워드의 역할은?',
          'DefinitelyTyped (@types)는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          '.d.ts는 타입 선언만, 구현은 없음',
          'declare는 외부 라이브러리 타입 정의',
          '@types는 커뮤니티 타입 정의 저장소'
        ],
        followUpAngles: [
          'ambient module은 무엇인가요?',
          'tsconfig.json의 types/typeRoots 옵션은?',
          'module augmentation은 언제 사용하나요?'
        ],
        tags: ['modules', 'declaration', 'types', 'ambient']
      },
      {
        id: 'typescript-type-safety',
        topic: '타입 안전성 패턴',
        description: '실전 타입 설계',
        sampleQuestions: [
          'never type은 언제 사용하나요?',
          'exhaustive check 패턴을 설명해주세요',
          'nominal typing을 TypeScript에서 구현하는 방법은?'
        ],
        keyConceptsToProbe: [
          'never는 발생하지 않는 타입, 모든 분기 처리 보장',
          'switch/if 분기 후 default에서 never 타입 할당',
          'branded type으로 구조적 타이핑 우회'
        ],
        followUpAngles: [
          'unknown vs any의 차이는?',
          'type predicate (is)의 활용은?',
          'const assertion (as const)은 언제 사용하나요?'
        ],
        tags: ['never', 'exhaustive-check', 'branded-types', 'type-safety']
      }
    ],
    senior: [
      {
        id: 'typescript-type-level-programming',
        topic: '타입 수준 프로그래밍',
        description: '고급 타입 조작',
        sampleQuestions: [
          '타입 수준에서 재귀를 구현한 경험은?',
          'variadic tuple types는 무엇인가요?',
          '타입 수준 연산 (DeepReadonly, DeepPartial) 구현 경험은?'
        ],
        keyConceptsToProbe: [
          '재귀 타입으로 중첩 구조 처리 (DeepReadonly<T>)',
          'variadic tuple은 가변 길이 튜플 ([...T, U])',
          'mapped type + conditional type + recursion 조합'
        ],
        followUpAngles: [
          'tail recursion optimization은 타입 수준에서 가능한가요?',
          'type-level 프로그래밍의 한계는?',
          'ts-toolbelt 같은 라이브러리 사용 경험은?'
        ],
        tags: ['recursive-types', 'variadic-tuples', 'type-programming']
      },
      {
        id: 'typescript-monorepo',
        topic: '모노레포 타입 전략',
        description: '대규모 프로젝트 타입 관리',
        sampleQuestions: [
          '모노레포에서 타입을 공유하는 전략은?',
          'project references는 무엇이며 왜 사용하나요?',
          '패키지 간 타입 의존성을 어떻게 관리하나요?'
        ],
        keyConceptsToProbe: [
          'shared types 패키지, composite: true, references 설정',
          'project references는 빌드 성능 향상, 증분 빌드',
          'exports 필드로 타입 진입점 제어'
        ],
        followUpAngles: [
          'turbo나 nx에서 타입 체크 최적화는?',
          'declaration map의 역할은?',
          'workspace protocol로 로컬 패키지 참조는?'
        ],
        tags: ['monorepo', 'project-references', 'composite', 'workspaces']
      },
      {
        id: 'typescript-runtime-validation',
        topic: '런타임 타입 검증 (Zod 등)',
        description: '타입과 런타임 동기화',
        sampleQuestions: [
          'Zod, io-ts 같은 런타임 검증 라이브러리를 사용하는 이유는?',
          'schema에서 타입을 추론하는 패턴은?',
          'tRPC 같은 end-to-end type safety 경험은?'
        ],
        keyConceptsToProbe: [
          '외부 데이터 (API, 폼)는 컴파일 타임 보장 불가, 런타임 검증 필요',
          'z.infer<typeof schema>로 스키마에서 타입 추출',
          'tRPC는 서버/클라이언트 타입 자동 동기화'
        ],
        followUpAngles: [
          'JSON schema와 TypeScript 타입 동기화는?',
          'class-validator vs Zod 선택 기준은?',
          'API 응답 타입 검증을 프로덕션에서도 하나요?'
        ],
        tags: ['zod', 'runtime-validation', 'schema', 'trpc']
      }
    ]
  },
  commonMistakes: [
    'any 남용: 타입 안전성 포기',
    '타입 단언 (as) 과다: 런타임 에러 위험',
    'enum 오용: const enum은 번들 크기 증가, union type 선호',
    'strict mode 미적용: 암묵적 any 허용'
  ],
  bestPractices: [
    'strict mode 활성화 (noImplicitAny, strictNullChecks)',
    'discriminated union으로 분기 처리',
    'exhaustive check로 모든 케이스 보장',
    'branded type으로 도메인 타입 구분'
  ],
  relatedTechnologies: ['javascript', 'react', 'nodejs', 'zod', 'eslint']
};

export default typescriptKnowledge;
