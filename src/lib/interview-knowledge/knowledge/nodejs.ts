import type { TechKnowledgeBase } from '../types';

const nodejsKnowledge: TechKnowledgeBase = {
  techId: 'nodejs',
  displayName: 'Node.js',
  category: 'backend',
  version: '20 LTS',
  topics: {
    junior: [
      {
        id: 'nodejs-event-loop',
        topic: 'Event Loop 기초',
        description: '비동기 처리 메커니즘 이해',
        sampleQuestions: [
          'Node.js의 Event Loop가 무엇인가요?',
          'Call Stack, Task Queue, Microtask Queue의 차이는?',
          'setTimeout과 setImmediate의 차이는?'
        ],
        keyConceptsToProbe: [
          'Event Loop는 단일 스레드에서 비동기 I/O 처리',
          'Call Stack (동기), Macrotask Queue (setTimeout), Microtask Queue (Promise)',
          'setTimeout은 타이머 후 실행, setImmediate는 I/O 후 실행'
        ],
        followUpAngles: [
          'process.nextTick은 언제 사용하나요?',
          'blocking operation의 예시는?',
          'libuv의 역할은 무엇인가요?'
        ],
        tags: ['event-loop', 'async', 'microtask', 'macrotask']
      },
      {
        id: 'nodejs-express-middleware',
        topic: 'Express 미들웨어',
        description: '요청/응답 처리 파이프라인',
        sampleQuestions: [
          'Express 미들웨어의 동작 원리는?',
          'next()를 호출하지 않으면 어떻게 되나요?',
          '에러 핸들링 미들웨어는 어떻게 작성하나요?'
        ],
        keyConceptsToProbe: [
          '미들웨어는 req, res, next를 받아 순차 실행',
          'next() 미호출 시 파이프라인 중단, 응답 보내지 않으면 hang',
          '에러 미들웨어는 4개 파라미터 (err, req, res, next)'
        ],
        followUpAngles: [
          'app.use()와 app.all()의 차이는?',
          '미들웨어 순서가 중요한 이유는?',
          'body-parser의 역할은?'
        ],
        tags: ['express', 'middleware', 'routing', 'error-handling']
      },
      {
        id: 'nodejs-async-programming',
        topic: '비동기 프로그래밍 (callback/Promise/async-await)',
        description: '비동기 코드 패턴',
        sampleQuestions: [
          'Callback Hell을 어떻게 해결하나요?',
          'Promise와 async/await의 차이는?',
          'Promise.all과 Promise.allSettled의 차이는?'
        ],
        keyConceptsToProbe: [
          'Promise 체이닝, async/await으로 동기 코드처럼 작성',
          'async/await은 Promise의 syntactic sugar',
          'Promise.all은 하나라도 실패 시 reject, allSettled는 모두 대기'
        ],
        followUpAngles: [
          'unhandled promise rejection은 언제 발생하나요?',
          'async 함수는 항상 Promise를 반환하나요?',
          'top-level await은 무엇인가요?'
        ],
        tags: ['async', 'promise', 'async-await', 'callback']
      }
    ],
    mid: [
      {
        id: 'nodejs-stream-buffer',
        topic: 'Stream/Buffer 처리',
        description: '대용량 데이터 효율적 처리',
        sampleQuestions: [
          'Stream을 사용하는 이유는 무엇인가요?',
          'Readable, Writable, Duplex, Transform Stream의 차이는?',
          'Buffer는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'Stream은 메모리 효율적, 청크 단위 처리',
          'Readable은 읽기, Writable은 쓰기, Duplex는 양방향, Transform은 변환',
          'Buffer는 바이너리 데이터 처리 (파일, 네트워크)'
        ],
        followUpAngles: [
          'pipe()와 pipeline()의 차이는?',
          'backpressure는 무엇이고 어떻게 처리하나요?',
          'fs.readFile vs fs.createReadStream 선택 기준은?'
        ],
        tags: ['stream', 'buffer', 'pipeline', 'io']
      },
      {
        id: 'nodejs-error-handling',
        topic: '에러 핸들링 패턴',
        description: '예외 처리 전략',
        sampleQuestions: [
          'try-catch로 잡히지 않는 에러는 어떻게 처리하나요?',
          'process.on("uncaughtException")은 언제 사용하나요?',
          'Operational Error와 Programmer Error의 차이는?'
        ],
        keyConceptsToProbe: [
          'uncaughtException, unhandledRejection 이벤트 리스너',
          'uncaughtException은 마지막 수단, graceful shutdown 후 재시작',
          'Operational은 예측 가능 (네트워크), Programmer는 버그 (null reference)'
        ],
        followUpAngles: [
          'async 함수에서 throw한 에러는 어떻게 잡나요?',
          'Express에서 async 에러를 처리하는 패턴은?',
          'Domain 모듈은 왜 deprecated 되었나요?'
        ],
        tags: ['error-handling', 'exception', 'uncaught', 'async-error']
      },
      {
        id: 'nodejs-security',
        topic: '보안 (CORS, 인젝션, rate limiting)',
        description: 'API 보안 강화',
        sampleQuestions: [
          'CORS 설정은 어떻게 하나요?',
          'SQL Injection과 NoSQL Injection을 어떻게 방지하나요?',
          'Rate Limiting은 왜 필요하고 어떻게 구현하나요?'
        ],
        keyConceptsToProbe: [
          'CORS 미들웨어로 origin 제한, credentials 설정',
          'Prepared Statement, ORM 사용, 입력 검증',
          'DDoS 방지, express-rate-limit, Redis로 분산 카운터'
        ],
        followUpAngles: [
          'Helmet.js는 어떤 보안 헤더를 설정하나요?',
          'JWT 토큰은 어디에 저장해야 안전한가요?',
          'XSS와 CSRF 공격을 어떻게 방어하나요?'
        ],
        tags: ['security', 'cors', 'injection', 'rate-limiting']
      }
    ],
    senior: [
      {
        id: 'nodejs-cluster-worker',
        topic: '클러스터링/워커 스레드',
        description: '멀티코어 활용',
        sampleQuestions: [
          'Cluster 모듈의 동작 원리는?',
          'Worker Threads를 사용하는 이유는?',
          'PM2의 역할과 장점은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'Master가 여러 Worker 프로세스 생성, CPU 코어 수만큼 활용',
          'Worker Threads는 CPU 집약 작업을 별도 스레드에서 처리',
          'PM2는 프로세스 관리, 자동 재시작, 로드 밸런싱'
        ],
        followUpAngles: [
          'Cluster 모드에서 메모리는 공유되나요?',
          'Worker Thread와 Child Process의 차이는?',
          'Zero-downtime deployment는 어떻게 구현하나요?'
        ],
        tags: ['cluster', 'worker-threads', 'pm2', 'multicore']
      },
      {
        id: 'nodejs-performance',
        topic: '성능 프로파일링/메모리 관리',
        description: '성능 병목 진단',
        sampleQuestions: [
          'Node.js 애플리케이션의 성능 병목을 어떻게 찾나요?',
          '메모리 누수를 진단하고 수정한 경험은?',
          'V8 엔진 최적화를 위한 팁은?'
        ],
        keyConceptsToProbe: [
          'clinic.js, Node.js profiler, --inspect로 Chrome DevTools 연결',
          'heapdump, memory profiler, WeakMap 활용',
          '함수 형태 일관성 (monomorphic), hidden class 최적화'
        ],
        followUpAngles: [
          'Event Loop Lag는 어떻게 측정하나요?',
          'GC (Garbage Collection) 튜닝 경험은?',
          'flame graph를 해석하는 방법은?'
        ],
        tags: ['performance', 'profiling', 'memory', 'v8']
      },
      {
        id: 'nodejs-msa',
        topic: 'MSA에서의 Node.js',
        description: '분산 시스템 설계',
        sampleQuestions: [
          'Node.js로 MSA를 구현한 경험을 말씀해주세요',
          'gRPC와 REST API 중 어떤 것을 선택하나요?',
          '서비스 간 통신 실패 시 어떻게 처리하나요?'
        ],
        keyConceptsToProbe: [
          'NestJS, Fastify 등 프레임워크, Message Queue (RabbitMQ, Kafka)',
          'gRPC는 내부 통신 (빠름), REST는 외부 API (범용)',
          'Circuit Breaker (opossum), Retry with exponential backoff'
        ],
        followUpAngles: [
          'Service Mesh (Istio)를 사용한 경험은?',
          'Distributed Tracing (OpenTelemetry)은 어떻게 구현하나요?',
          'Event-driven architecture 경험은?'
        ],
        tags: ['msa', 'grpc', 'message-queue', 'distributed-system']
      }
    ]
  },
  commonMistakes: [
    'Callback Hell: 중첩된 콜백으로 가독성 저하',
    '에러 미처리 Promise: unhandledRejection으로 프로세스 종료',
    '동기 블로킹 코드: fs.readFileSync 남용으로 전체 서버 블로킹',
    '메모리 누수: Event Listener 미제거, 전역 변수 과다 사용'
  ],
  bestPractices: [
    '에러 핸들링 미들웨어로 중앙화',
    '환경 변수로 설정 관리 (dotenv)',
    'Graceful shutdown으로 진행 중 요청 완료',
    '구조화된 로깅 (winston, pino)'
  ],
  relatedTechnologies: ['express', 'fastify', 'nestjs', 'typescript', 'postgresql', 'redis']
};

export default nodejsKnowledge;
