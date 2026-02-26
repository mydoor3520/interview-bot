import type { TechKnowledgeBase } from '../types';

const pythonKnowledge: TechKnowledgeBase = {
  techId: 'python',
  displayName: 'Python',
  category: 'language',
  version: '3.12',
  topics: {
    junior: [
      {
        id: 'python-data-types',
        topic: '데이터 타입과 컬렉션',
        description: 'list, dict, tuple, set 활용',
        sampleQuestions: [
          'list와 tuple의 차이는 무엇인가요?',
          'dict의 시간 복잡도는 어떻게 되나요?',
          'set은 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          'list는 가변(mutable), tuple은 불변(immutable)',
          'dict는 해시 테이블 기반, O(1) 평균 조회/삽입',
          'set은 중복 제거, 집합 연산(합집합/교집합)에 유용'
        ],
        followUpAngles: [
          'list comprehension의 장점은?',
          'defaultdict와 dict의 차이는?',
          'frozenset은 무엇인가요?'
        ],
        tags: ['data-types', 'collections', 'list', 'dict']
      },
      {
        id: 'python-functions',
        topic: '함수와 데코레이터',
        description: '함수 정의, *args/**kwargs, 데코레이터',
        sampleQuestions: [
          '*args와 **kwargs는 무엇인가요?',
          '데코레이터의 동작 원리를 설명해주세요',
          'lambda 함수는 언제 사용하나요?'
        ],
        keyConceptsToProbe: [
          '*args는 가변 위치 인자(튜플), **kwargs는 가변 키워드 인자(딕셔너리)',
          '데코레이터는 함수를 감싸서 기능 추가(로깅, 인증 등)',
          'lambda는 간단한 익명 함수, map/filter에서 주로 사용'
        ],
        followUpAngles: [
          '@staticmethod와 @classmethod의 차이는?',
          'functools.wraps는 왜 필요한가요?',
          'closure는 무엇인가요?'
        ],
        tags: ['functions', 'decorator', 'args', 'kwargs']
      },
      {
        id: 'python-file-io',
        topic: '파일 입출력과 예외 처리',
        description: 'with 문, 파일 읽기/쓰기, try-except',
        sampleQuestions: [
          'with 문을 사용하는 이유는?',
          'open()의 모드(r, w, a)를 설명해주세요',
          '예외 처리에서 else와 finally는 언제 실행되나요?'
        ],
        keyConceptsToProbe: [
          'with는 context manager, 자동으로 close() 호출',
          'r은 읽기, w는 쓰기(덮어씀), a는 추가 모드',
          'else는 예외 없을 때, finally는 항상 실행'
        ],
        followUpAngles: [
          'Context Manager를 직접 만들려면?',
          'FileNotFoundError vs IOError는?',
          'JSON 파일은 어떻게 다루나요?'
        ],
        tags: ['file-io', 'exception', 'context-manager', 'with']
      }
    ],
    mid: [
      {
        id: 'python-generators',
        topic: '제너레이터와 이터레이터',
        description: 'yield, iterator protocol, 메모리 효율',
        sampleQuestions: [
          '제너레이터는 일반 함수와 어떻게 다른가요?',
          'yield from은 무엇인가요?',
          '이터레이터 프로토콜(__iter__, __next__)을 설명해주세요'
        ],
        keyConceptsToProbe: [
          '제너레이터는 yield로 값을 하나씩 생성, 메모리 효율적',
          'yield from은 하위 제너레이터에 위임',
          '__iter__는 이터레이터 반환, __next__는 다음 값 반환'
        ],
        followUpAngles: [
          'Generator Expression vs List Comprehension?',
          'itertools 모듈 사용 경험은?',
          'send()와 throw() 메서드는 무엇인가요?'
        ],
        tags: ['generator', 'iterator', 'yield', 'lazy-evaluation']
      },
      {
        id: 'python-threading',
        topic: '멀티스레딩과 GIL',
        description: 'threading, multiprocessing, GIL 이해',
        sampleQuestions: [
          'GIL(Global Interpreter Lock)이 무엇인가요?',
          'threading과 multiprocessing은 언제 사용하나요?',
          'asyncio는 어떻게 동작하나요?'
        ],
        keyConceptsToProbe: [
          'GIL은 한 번에 하나의 스레드만 바이트코드 실행 (CPU 병렬화 제한)',
          'threading은 I/O 바운드, multiprocessing은 CPU 바운드 작업',
          'asyncio는 단일 스레드 비동기, event loop로 코루틴 스케줄링'
        ],
        followUpAngles: [
          'concurrent.futures는 무엇인가요?',
          'async/await 키워드를 설명해주세요',
          'GIL을 피하는 방법은?'
        ],
        tags: ['threading', 'gil', 'multiprocessing', 'asyncio']
      },
      {
        id: 'python-type-hints',
        topic: '타입 힌팅과 mypy',
        description: '정적 타입 체크, typing 모듈',
        sampleQuestions: [
          '타입 힌팅의 장점은 무엇인가요?',
          'Optional, Union, List[str]을 설명해주세요',
          'mypy는 어떻게 사용하나요?'
        ],
        keyConceptsToProbe: [
          '코드 가독성, IDE 자동완성, 정적 분석으로 버그 조기 발견',
          'Optional[T]는 T | None, Union[A, B]는 A 또는 B, List[str]은 문자열 리스트',
          'mypy는 정적 타입 체커, CI/CD 파이프라인에 통합'
        ],
        followUpAngles: [
          'Protocol은 무엇인가요?',
          'TypeVar와 Generic은 언제 사용하나요?',
          'Literal과 Final은 무엇인가요?'
        ],
        tags: ['type-hints', 'mypy', 'typing', 'static-analysis']
      }
    ],
    senior: [
      {
        id: 'python-metaprogramming',
        topic: '메타프로그래밍',
        description: '메타클래스, 디스크립터, __getattr__',
        sampleQuestions: [
          '메타클래스는 무엇이고 언제 사용하나요?',
          '디스크립터 프로토콜을 설명해주세요',
          '__getattr__와 __getattribute__의 차이는?'
        ],
        keyConceptsToProbe: [
          '메타클래스는 클래스의 클래스, type 상속, 클래스 생성 시 동작 제어',
          '디스크립터는 __get__/__set__/__delete__ 구현, property가 대표적',
          '__getattr__는 속성 없을 때, __getattribute__는 항상 호출'
        ],
        followUpAngles: [
          '__new__와 __init__의 차이는?',
          'ABCMeta는 무엇인가요?',
          '__slots__는 왜 사용하나요?'
        ],
        tags: ['metaprogramming', 'metaclass', 'descriptor', 'dunder']
      },
      {
        id: 'python-memory-management',
        topic: '메모리 관리와 CPython 내부',
        description: '레퍼런스 카운팅, GC, 메모리 최적화',
        sampleQuestions: [
          'CPython의 메모리 관리 방식을 설명해주세요',
          '순환 참조는 어떻게 해결되나요?',
          'sys.getrefcount()로 무엇을 확인할 수 있나요?'
        ],
        keyConceptsToProbe: [
          'reference counting이 기본, 0이 되면 즉시 해제',
          'generational GC로 순환 참조 탐지 및 정리',
          'getrefcount()는 객체의 참조 횟수 반환 (디버깅용)'
        ],
        followUpAngles: [
          'weakref 모듈은 언제 사용하나요?',
          'memory_profiler로 메모리 누수를 찾아본 경험은?',
          '__del__ 메서드는 언제 호출되나요?'
        ],
        tags: ['memory', 'gc', 'cpython', 'refcount']
      },
      {
        id: 'python-performance',
        topic: '고성능 Python',
        description: 'Cython, asyncio 심화, 프로파일링',
        sampleQuestions: [
          'Cython으로 성능을 개선한 경험이 있나요?',
          'asyncio의 event loop를 커스터마이징한 경험은?',
          'cProfile과 line_profiler의 차이는?'
        ],
        keyConceptsToProbe: [
          'Cython은 Python을 C로 변환, 타입 선언으로 10-100배 속도 향상',
          'asyncio.get_event_loop(), uvloop로 대체 가능',
          'cProfile은 함수 단위, line_profiler는 라인 단위 프로파일링'
        ],
        followUpAngles: [
          'NumPy/Pandas로 벡터화 최적화 경험은?',
          'PyPy는 어떻게 성능을 개선하나요?',
          'JIT 컴파일(Numba)을 사용해본 적이 있나요?'
        ],
        tags: ['performance', 'cython', 'asyncio', 'profiling']
      }
    ]
  },
  commonMistakes: [
    'mutable default argument 사용 (def func(arr=[])): 모든 호출이 같은 리스트 공유',
    '==와 is 혼동: ==는 값 비교, is는 객체 동일성 비교',
    'list를 순회하며 삭제: 인덱스 꼬임 (역순 순회나 list comprehension 권장)',
    'except Exception: pass로 모든 예외 무시 (디버깅 어려움)'
  ],
  bestPractices: [
    'List comprehension과 generator expression 활용',
    'with 문으로 리소스 자동 관리',
    '타입 힌팅 + mypy로 정적 분석',
    'logging 모듈로 체계적인 로그 관리 (print 대신)'
  ],
  relatedTechnologies: ['django', 'fastapi', 'flask', 'pandas', 'numpy', 'asyncio']
};

export default pythonKnowledge;
