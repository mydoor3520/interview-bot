import type { TechKnowledgeBase } from '../types';

const javaKnowledge: TechKnowledgeBase = {
  techId: 'java',
  displayName: 'Java',
  category: 'language',
  version: '21 LTS',
  topics: {
    junior: [
      {
        id: 'java-oop-basics',
        topic: '객체지향 프로그래밍 기초',
        description: '상속, 다형성, 캡슐화 이해',
        sampleQuestions: [
          '상속과 인터페이스의 차이는 무엇인가요?',
          '오버로딩(Overloading)과 오버라이딩(Overriding)의 차이는?',
          '캡슐화를 구현하는 방법을 설명해주세요'
        ],
        keyConceptsToProbe: [
          '상속은 extends, 인터페이스는 implements (다중 구현 가능)',
          '오버로딩은 메서드 시그니처 다름, 오버라이딩은 부모 메서드 재정의',
          'private 필드 + public getter/setter로 접근 제어'
        ],
        followUpAngles: [
          '추상 클래스와 인터페이스는 언제 사용하나요?',
          'final 키워드는 어떤 역할을 하나요?',
          'SOLID 원칙 중 OCP는 무엇인가요?'
        ],
        tags: ['oop', 'inheritance', 'polymorphism', 'encapsulation']
      },
      {
        id: 'java-collections',
        topic: '컬렉션 프레임워크',
        description: 'List, Set, Map 활용',
        sampleQuestions: [
          'ArrayList와 LinkedList의 차이는?',
          'HashMap의 내부 동작 원리를 설명해주세요',
          'HashSet은 어떻게 중복을 방지하나요?'
        ],
        keyConceptsToProbe: [
          'ArrayList는 배열 기반(인덱스 접근 빠름), LinkedList는 노드 기반(삽입/삭제 빠름)',
          'key의 hashCode()로 bucket 결정, equals()로 충돌 해결',
          'equals()와 hashCode()를 사용해 중복 검사'
        ],
        followUpAngles: [
          'ConcurrentHashMap은 왜 사용하나요?',
          'Collections.sort()와 Comparable의 관계는?',
          'TreeMap과 HashMap의 차이는?'
        ],
        tags: ['collections', 'list', 'map', 'set']
      },
      {
        id: 'java-exception',
        topic: '예외 처리',
        description: 'checked/unchecked 예외와 처리 전략',
        sampleQuestions: [
          'Checked Exception과 Unchecked Exception의 차이는?',
          'try-with-resources는 무엇인가요?',
          'finally 블록은 언제 실행되나요?'
        ],
        keyConceptsToProbe: [
          'Checked는 컴파일 타임 확인(IOException), Unchecked는 런타임(NullPointerException)',
          'AutoCloseable 구현 자원을 자동으로 close',
          'return 전에도 finally는 실행 (단, System.exit() 제외)'
        ],
        followUpAngles: [
          '사용자 정의 예외는 언제 만드나요?',
          'throw와 throws의 차이는?',
          '예외 체이닝은 무엇인가요?'
        ],
        tags: ['exception', 'try-catch', 'error-handling']
      }
    ],
    mid: [
      {
        id: 'java-jvm-memory',
        topic: 'JVM 메모리 구조와 가비지 컬렉션',
        description: 'Heap, Stack, GC 알고리즘 이해',
        sampleQuestions: [
          'JVM 메모리 영역을 설명해주세요',
          'Young Generation과 Old Generation의 차이는?',
          'G1 GC와 ZGC의 차이는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'Heap(객체), Stack(지역변수/메서드 호출), Metaspace(클래스 메타데이터)',
          'Young은 새 객체, Minor GC 빈번, Old는 오래된 객체, Major GC 무거움',
          'G1은 리전 기반, ZGC는 초저지연(10ms 이하)'
        ],
        followUpAngles: [
          'OutOfMemoryError는 어떻게 디버깅하나요?',
          'GC 튜닝 경험이 있나요?',
          'Weak Reference와 Soft Reference는 언제 사용하나요?'
        ],
        tags: ['jvm', 'memory', 'gc', 'heap']
      },
      {
        id: 'java-concurrency',
        topic: '동시성 프로그래밍',
        description: '스레드, Lock, Concurrent 패키지',
        sampleQuestions: [
          'synchronized와 ReentrantLock의 차이는?',
          'volatile 키워드는 무엇을 보장하나요?',
          'ExecutorService는 왜 사용하나요?'
        ],
        keyConceptsToProbe: [
          'synchronized는 암묵적, ReentrantLock은 명시적(tryLock, timeout 지원)',
          'volatile은 가시성 보장(최신 값 읽기), 원자성은 보장 안 함',
          '스레드 풀 관리, 작업 큐잉, 재사용으로 성능 향상'
        ],
        followUpAngles: [
          'ConcurrentHashMap의 내부 동작은?',
          'CountDownLatch와 CyclicBarrier의 차이는?',
          'Atomic 클래스는 어떻게 동작하나요?'
        ],
        tags: ['concurrency', 'thread', 'lock', 'executor']
      },
      {
        id: 'java-functional',
        topic: '함수형 프로그래밍',
        description: 'Stream API, Lambda, Optional',
        sampleQuestions: [
          'Stream의 중간 연산과 최종 연산을 설명해주세요',
          'map()과 flatMap()의 차이는?',
          'Optional은 왜 사용하나요?'
        ],
        keyConceptsToProbe: [
          '중간 연산(filter, map)은 lazy, 최종 연산(collect, forEach)이 실행 트리거',
          'map은 1:1 변환, flatMap은 1:N 변환 후 평탄화',
          'null 대신 Optional로 명시적 부재 표현, NullPointerException 방지'
        ],
        followUpAngles: [
          'parallel stream은 언제 사용하나요?',
          'Collector.groupingBy는 무엇인가요?',
          'Method Reference는 언제 사용하나요?'
        ],
        tags: ['stream', 'lambda', 'optional', 'functional']
      }
    ],
    senior: [
      {
        id: 'java-performance-tuning',
        topic: 'JVM 튜닝과 성능 최적화',
        description: 'GC 튜닝, 프로파일링, 메모리 누수 해결',
        sampleQuestions: [
          'JVM 옵션을 이용한 성능 튜닝 경험을 말씀해주세요',
          '메모리 누수를 어떻게 탐지하고 해결하나요?',
          'JIT 컴파일러의 최적화 기법은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          '-Xms, -Xmx로 힙 크기, -XX:+UseG1GC로 GC 선택',
          'VisualVM, JProfiler로 힙 덤프 분석, Weak Reference 누수 확인',
          '인라이닝, 탈출 분석, 루프 최적화'
        ],
        followUpAngles: [
          'GC 로그를 어떻게 분석하나요?',
          'CPU 프로파일링은 어떻게 하나요?',
          'Native Memory 누수는 어떻게 추적하나요?'
        ],
        tags: ['performance', 'tuning', 'profiling', 'jit']
      },
      {
        id: 'java-multimodule-architecture',
        topic: '멀티 모듈 아키텍처',
        description: '모듈 시스템, 의존성 관리, 빌드 최적화',
        sampleQuestions: [
          'Java 9 모듈 시스템(JPMS)을 사용한 경험이 있나요?',
          '멀티 모듈 프로젝트에서 의존성을 어떻게 관리하나요?',
          '빌드 시간을 단축한 경험을 말씀해주세요'
        ],
        keyConceptsToProbe: [
          'module-info.java로 명시적 의존성, exports/requires 선언',
          'Gradle/Maven 멀티 모듈 설정, BOM으로 버전 통합 관리',
          '병렬 빌드, 증분 컴파일, 빌드 캐시 활용'
        ],
        followUpAngles: [
          '도메인별 모듈 분리 전략은?',
          '순환 의존성은 어떻게 해결하나요?',
          'Classpath Hell 문제를 겪은 적이 있나요?'
        ],
        tags: ['architecture', 'modules', 'build', 'dependency']
      },
      {
        id: 'java-modern-features',
        topic: 'Java 최신 기능 활용',
        description: 'Virtual Threads, Record, Pattern Matching',
        sampleQuestions: [
          'Virtual Threads는 기존 스레드와 어떻게 다른가요?',
          'Record 클래스는 언제 사용하나요?',
          'Pattern Matching for switch를 설명해주세요'
        ],
        keyConceptsToProbe: [
          'Virtual Thread는 경량(Loom 프로젝트), 블로킹 작업에 유리',
          'Record는 불변 DTO, equals/hashCode/toString 자동 생성',
          'switch에서 타입 패턴 매칭, when 가드 조건 지원'
        ],
        followUpAngles: [
          'Structured Concurrency는 무엇인가요?',
          'Sealed Classes는 언제 사용하나요?',
          'Text Blocks는 어떤 문제를 해결하나요?'
        ],
        tags: ['virtual-threads', 'record', 'pattern-matching', 'modern-java']
      }
    ]
  },
  commonMistakes: [
    '== 연산자로 문자열 비교 (equals() 사용해야 함)',
    'equals() 오버라이드 시 hashCode() 미구현',
    'finally 블록에서 close() 직접 호출 (try-with-resources 권장)',
    'ArrayList에서 빈번한 중간 삽입/삭제 (LinkedList 고려)'
  ],
  bestPractices: [
    '불변 객체 선호 (final 필드, 방어적 복사)',
    'Stream API로 가독성 높은 컬렉션 처리',
    'Optional로 null 안전성 확보',
    'CompletableFuture로 비동기 작업 체이닝'
  ],
  relatedTechnologies: ['spring-boot', 'kotlin', 'jvm', 'gradle', 'maven']
};

export default javaKnowledge;
