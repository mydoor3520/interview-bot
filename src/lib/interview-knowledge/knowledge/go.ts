import type { TechKnowledgeBase } from '../types';

const goKnowledge: TechKnowledgeBase = {
  techId: 'go',
  displayName: 'Go',
  category: 'language',
  version: '1.23',
  topics: {
    junior: [
      {
        id: 'go-goroutine-channel',
        topic: 'Goroutine과 Channel 기초',
        description: '경량 동시성과 메시지 패싱',
        sampleQuestions: [
          'Goroutine은 스레드와 어떻게 다른가요?',
          'Channel의 버퍼(buffered)와 언버퍼(unbuffered)의 차이는?',
          'close(channel)은 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'Goroutine은 경량(2KB), M:N 스케줄링으로 효율적',
          'Unbuffered는 송수신 동기화, Buffered는 큐 크기만큼 비동기',
          'close는 송신자가 호출, 수신자는 range로 종료 감지'
        ],
        followUpAngles: [
          'go 키워드로 시작된 goroutine은 언제 종료되나요?',
          'Channel에서 데이터를 보내는데 받는 곳이 없으면?',
          'for range channel은 어떻게 동작하나요?'
        ],
        tags: ['goroutine', 'channel', 'concurrency', 'parallelism']
      },
      {
        id: 'go-interface-struct',
        topic: '인터페이스와 구조체',
        description: '타입 시스템과 덕 타이핑',
        sampleQuestions: [
          'Go의 인터페이스는 어떻게 구현하나요?',
          '구조체 임베딩은 무엇인가요?',
          'empty interface(interface{})는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          '명시적 implements 없이 메서드 시그니처만 일치하면 자동 구현',
          '구조체 필드로 다른 구조체 포함, 메서드 승격',
          'interface{}는 모든 타입 수용, 타입 단언(type assertion) 필요'
        ],
        followUpAngles: [
          '포인터 리시버와 값 리시버의 차이는?',
          'Type Assertion과 Type Switch는?',
          'io.Reader, io.Writer 인터페이스를 설명해주세요'
        ],
        tags: ['interface', 'struct', 'duck-typing', 'embedding']
      },
      {
        id: 'go-error-handling',
        topic: '에러 처리 패턴',
        description: 'error 타입과 처리 관례',
        sampleQuestions: [
          'Go에서 에러는 어떻게 반환하나요?',
          'errors.Is()와 errors.As()의 차이는?',
          'panic과 recover는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          '함수 마지막 반환값으로 error 타입 반환, if err != nil 체크',
          'errors.Is는 에러 동등성, errors.As는 타입 변환',
          'panic은 복구 불가능한 상황, recover는 defer 안에서만 동작'
        ],
        followUpAngles: [
          'fmt.Errorf()의 %w는 무엇인가요?',
          '커스텀 에러 타입은 어떻게 만드나요?',
          'sentinel error는 무엇인가요?'
        ],
        tags: ['error', 'panic', 'recover', 'error-handling']
      }
    ],
    mid: [
      {
        id: 'go-concurrency-patterns',
        topic: '동시성 패턴',
        description: 'select, context, WaitGroup',
        sampleQuestions: [
          'select 문은 어떻게 동작하나요?',
          'context.Context는 왜 사용하나요?',
          'sync.WaitGroup의 역할은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'select는 여러 channel 중 준비된 것 선택, default로 non-blocking',
          'context는 타임아웃/취소 전파, 요청 범위 값 전달',
          'WaitGroup은 여러 goroutine 완료 대기 (Add, Done, Wait)'
        ],
        followUpAngles: [
          'context.WithTimeout과 context.WithCancel의 차이는?',
          'select에서 default는 언제 사용하나요?',
          'sync.Mutex와 sync.RWMutex의 차이는?'
        ],
        tags: ['select', 'context', 'waitgroup', 'sync']
      },
      {
        id: 'go-testing',
        topic: '테스팅과 벤치마크',
        description: 'testing 패키지, 테이블 주도 테스트',
        sampleQuestions: [
          '테이블 주도 테스트(Table-Driven Test)를 설명해주세요',
          't.Run()의 서브 테스트는 왜 사용하나요?',
          '벤치마크는 어떻게 작성하나요?'
        ],
        keyConceptsToProbe: [
          '슬라이스에 테스트 케이스 정의, 반복문으로 실행',
          't.Run()으로 서브 테스트 분리, 독립 실행 가능',
          'func BenchmarkXxx(b *testing.B)로 작성, b.N 반복'
        ],
        followUpAngles: [
          'testify 라이브러리를 사용해본 적이 있나요?',
          'go test -cover로 커버리지를 어떻게 확인하나요?',
          'httptest 패키지는 무엇인가요?'
        ],
        tags: ['testing', 'benchmark', 'table-driven', 'unit-test']
      },
      {
        id: 'go-stdlib',
        topic: '표준 라이브러리 활용',
        description: 'net/http, encoding/json, 주요 패키지',
        sampleQuestions: [
          'http.Handler 인터페이스를 설명해주세요',
          'JSON 마샬링/언마샬링은 어떻게 하나요?',
          'io.Copy()는 무엇을 하나요?'
        ],
        keyConceptsToProbe: [
          'ServeHTTP(w, r) 메서드 하나로 정의, http.HandlerFunc로 함수 래핑',
          'json.Marshal()로 구조체→JSON, json.Unmarshal()로 JSON→구조체',
          'io.Copy()는 Reader에서 Writer로 데이터 복사 (스트리밍)'
        ],
        followUpAngles: [
          'http.Client의 타임아웃 설정은?',
          'struct 태그(json:"name")의 역할은?',
          'bufio 패키지는 언제 사용하나요?'
        ],
        tags: ['stdlib', 'http', 'json', 'io']
      }
    ],
    senior: [
      {
        id: 'go-runtime-scheduler',
        topic: 'Go 런타임과 스케줄러',
        description: 'M:N 스케줄링, GMP 모델',
        sampleQuestions: [
          'Go의 GMP 모델을 설명해주세요',
          'GOMAXPROCS는 무엇을 제어하나요?',
          'Work Stealing은 어떻게 동작하나요?'
        ],
        keyConceptsToProbe: [
          'G(Goroutine), M(OS Thread), P(Processor), P가 G를 M에 스케줄링',
          'GOMAXPROCS는 동시 실행 P의 개수 (기본값: CPU 코어 수)',
          'Work Stealing은 유휴 P가 다른 P의 run queue에서 G 가져옴'
        ],
        followUpAngles: [
          'Goroutine이 blocking syscall을 호출하면?',
          'runtime.Gosched()는 무엇을 하나요?',
          'runtime.LockOSThread()는 언제 사용하나요?'
        ],
        tags: ['runtime', 'scheduler', 'gmp', 'concurrency']
      },
      {
        id: 'go-architecture',
        topic: '대규모 Go 아키텍처',
        description: '프로젝트 구조, 의존성 관리, 모듈',
        sampleQuestions: [
          'Go 프로젝트의 표준 디렉토리 구조를 설명해주세요',
          'go mod의 주요 명령어는?',
          '의존성 순환 참조는 어떻게 해결하나요?'
        ],
        keyConceptsToProbe: [
          'cmd/, internal/, pkg/, api/ 등 디렉토리 분리',
          'go mod init, tidy, vendor, download',
          'internal/ 패키지 사용, 인터페이스로 의존성 역전'
        ],
        followUpAngles: [
          'internal/ 디렉토리의 특별한 점은?',
          'replace directive는 언제 사용하나요?',
          'Hexagonal Architecture를 Go에 적용한 경험은?'
        ],
        tags: ['architecture', 'modules', 'project-structure', 'dependencies']
      },
      {
        id: 'go-performance',
        topic: '성능 프로파일링과 최적화',
        description: 'pprof, trace, 메모리 최적화',
        sampleQuestions: [
          'pprof로 CPU 프로파일링을 어떻게 하나요?',
          'go tool trace의 용도는 무엇인가요?',
          'Escape Analysis는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'import _ "net/http/pprof", /debug/pprof 엔드포인트 노출',
          'trace는 goroutine 실행 타임라인, 스케줄링 분석',
          'Escape Analysis는 변수가 힙/스택 중 어디 할당될지 결정'
        ],
        followUpAngles: [
          'sync.Pool은 언제 사용하나요?',
          'go build -gcflags="-m"으로 무엇을 확인하나요?',
          'Inlining 최적화는 어떻게 동작하나요?'
        ],
        tags: ['performance', 'pprof', 'trace', 'optimization']
      }
    ]
  },
  commonMistakes: [
    'range 루프에서 포인터 캡처: 모든 goroutine이 마지막 값 참조',
    'Channel 닫지 않음: goroutine 누수 발생',
    'defer를 루프 안에서 사용: 함수 종료 시까지 실행 안 됨',
    '값 리시버로 상태 변경 시도: 복사본 수정으로 원본 불변'
  ],
  bestPractices: [
    'Accept interfaces, return structs (유연한 입력, 구체적 출력)',
    'Context를 함수 첫 번째 인자로 전달',
    'Goroutine leak 방지: context 취소 처리',
    'gofmt, golint, go vet으로 코드 품질 유지'
  ],
  relatedTechnologies: ['kubernetes', 'docker', 'prometheus', 'grpc', 'gin', 'echo']
};

export default goKnowledge;
