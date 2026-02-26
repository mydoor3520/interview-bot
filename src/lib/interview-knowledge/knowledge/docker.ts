import type { TechKnowledgeBase } from '../types';

const dockerKnowledge: TechKnowledgeBase = {
  techId: 'docker',
  displayName: 'Docker',
  category: 'infra',
  version: '27.x',
  topics: {
    junior: [
      {
        id: 'docker-image-container',
        topic: '이미지와 컨테이너 기초',
        description: 'Docker의 핵심 개념 이해',
        sampleQuestions: [
          '이미지와 컨테이너의 차이는 무엇인가요?',
          'docker run과 docker start의 차이는?',
          'docker ps와 docker images의 차이는?'
        ],
        keyConceptsToProbe: [
          '이미지는 읽기 전용 템플릿, 컨테이너는 실행 중인 인스턴스',
          'run은 새 컨테이너 생성+시작, start는 중지된 컨테이너 재시작',
          'ps는 컨테이너 목록, images는 이미지 목록'
        ],
        followUpAngles: [
          'docker exec과 docker attach의 차이는?',
          '-d 옵션은 무엇을 하나요?',
          '컨테이너를 삭제하려면 어떻게 하나요?'
        ],
        tags: ['image', 'container', 'basics', 'docker-run']
      },
      {
        id: 'docker-dockerfile',
        topic: 'Dockerfile 작성',
        description: '이미지 빌드 스크립트',
        sampleQuestions: [
          'FROM, RUN, CMD의 역할을 설명해주세요',
          'COPY와 ADD의 차이는?',
          'ENTRYPOINT와 CMD의 차이는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'FROM은 베이스 이미지, RUN은 빌드 시 명령, CMD는 실행 시 기본 명령',
          'COPY는 단순 복사, ADD는 URL/압축 해제 지원 (COPY 권장)',
          'ENTRYPOINT는 고정 실행 파일, CMD는 기본 인자 (조합 가능)'
        ],
        followUpAngles: [
          'ENV와 ARG의 차이는?',
          'WORKDIR은 무엇인가요?',
          '.dockerignore 파일의 역할은?'
        ],
        tags: ['dockerfile', 'build', 'from', 'cmd']
      },
      {
        id: 'docker-compose',
        topic: 'Docker Compose',
        description: '멀티 컨테이너 애플리케이션 정의',
        sampleQuestions: [
          'docker-compose.yml의 구조를 설명해주세요',
          'docker-compose up과 docker-compose start의 차이는?',
          'depends_on은 무엇을 하나요?'
        ],
        keyConceptsToProbe: [
          'version, services, networks, volumes 섹션으로 구성',
          'up은 컨테이너 생성+시작, start는 기존 컨테이너 시작',
          'depends_on은 시작 순서 지정 (완전한 준비는 보장 안 함)'
        ],
        followUpAngles: [
          'docker-compose down은 무엇을 하나요?',
          'environment와 env_file의 차이는?',
          'ports와 expose의 차이는?'
        ],
        tags: ['docker-compose', 'multi-container', 'orchestration', 'yaml']
      }
    ],
    mid: [
      {
        id: 'docker-multistage',
        topic: '멀티스테이지 빌드와 최적화',
        description: '이미지 크기 줄이기',
        sampleQuestions: [
          '멀티스테이지 빌드는 무엇이고 왜 사용하나요?',
          '이미지 레이어는 어떻게 캐싱되나요?',
          'alpine 이미지는 왜 사용하나요?'
        ],
        keyConceptsToProbe: [
          '여러 FROM 사용, 빌드 도구 제외하고 최종 산출물만 포함',
          'Dockerfile 각 명령이 레이어 생성, 변경 없으면 캐시 사용',
          'alpine은 경량 리눅스(5MB), 보안 취약점 최소화'
        ],
        followUpAngles: [
          'COPY --from은 무엇인가요?',
          'RUN 명령을 하나로 합치는 이유는?',
          '.dockerignore로 빌드를 어떻게 최적화하나요?'
        ],
        tags: ['multistage', 'optimization', 'alpine', 'layer-caching']
      },
      {
        id: 'docker-networking',
        topic: '네트워킹',
        description: 'bridge, overlay, host 네트워크',
        sampleQuestions: [
          'Docker의 네트워크 드라이버 종류를 설명해주세요',
          '컨테이너 간 통신은 어떻게 하나요?',
          'port mapping (-p)은 어떻게 동작하나요?'
        ],
        keyConceptsToProbe: [
          'bridge(기본, 단일 호스트), overlay(Swarm, 멀티 호스트), host(호스트 네트워크 직접)',
          '같은 네트워크 내 컨테이너명으로 DNS 해석',
          '-p host:container로 호스트 포트를 컨테이너 포트에 매핑'
        ],
        followUpAngles: [
          'docker network create는 언제 사용하나요?',
          '127.0.0.1과 0.0.0.0의 차이는?',
          '컨테이너에서 호스트로 접근하려면?'
        ],
        tags: ['networking', 'bridge', 'overlay', 'port-mapping']
      },
      {
        id: 'docker-volumes',
        topic: '볼륨과 스토리지 관리',
        description: '데이터 영속성',
        sampleQuestions: [
          'Volume, Bind Mount, tmpfs의 차이는?',
          'Named Volume은 왜 사용하나요?',
          '볼륨 데이터는 어디에 저장되나요?'
        ],
        keyConceptsToProbe: [
          'Volume은 Docker 관리, Bind Mount는 호스트 경로, tmpfs는 메모리',
          'Named Volume은 재사용 가능, Docker가 위치 관리',
          '/var/lib/docker/volumes/ (Linux 기준)'
        ],
        followUpAngles: [
          'docker volume prune은 무엇을 하나요?',
          '읽기 전용 볼륨은 어떻게 마운트하나요?',
          'Volume Driver는 무엇인가요?'
        ],
        tags: ['volume', 'storage', 'bind-mount', 'persistence']
      }
    ],
    senior: [
      {
        id: 'docker-security',
        topic: '보안 강화',
        description: 'rootless, seccomp, AppArmor',
        sampleQuestions: [
          'Rootless Docker는 무엇이고 왜 사용하나요?',
          'seccomp와 AppArmor는 무엇인가요?',
          '이미지 취약점은 어떻게 스캔하나요?'
        ],
        keyConceptsToProbe: [
          'rootless는 비root 유저로 Docker 데몬 실행, 권한 상승 방지',
          'seccomp는 시스템 콜 필터링, AppArmor는 파일 접근 제어',
          'docker scan, Trivy, Clair 등 도구 사용'
        ],
        followUpAngles: [
          '--cap-drop과 --cap-add는 무엇인가요?',
          'USER 지시어를 Dockerfile에 추가하는 이유는?',
          'Content Trust는 무엇인가요?'
        ],
        tags: ['security', 'rootless', 'seccomp', 'vulnerability']
      },
      {
        id: 'docker-production',
        topic: '프로덕션 운영 전략',
        description: '로깅, 모니터링, 헬스체크',
        sampleQuestions: [
          '컨테이너 로그는 어떻게 수집하나요?',
          'HEALTHCHECK 지시어는 무엇인가요?',
          '리소스 제한(CPU, 메모리)은 어떻게 설정하나요?'
        ],
        keyConceptsToProbe: [
          'docker logs, json-file 드라이버, ELK/Fluentd로 중앙화',
          'HEALTHCHECK는 컨테이너 상태 확인 명령, 재시작 트리거',
          '--cpus, --memory로 리소스 제한, 초과 시 throttling/OOM'
        ],
        followUpAngles: [
          'restart policy는 어떤 종류가 있나요?',
          'cAdvisor와 Prometheus 연동 경험은?',
          'Docker Swarm vs Kubernetes 비교는?'
        ],
        tags: ['production', 'logging', 'healthcheck', 'monitoring']
      },
      {
        id: 'docker-cicd',
        topic: 'CI/CD 통합',
        description: '빌드 자동화와 배포',
        sampleQuestions: [
          'Docker 이미지 빌드를 CI/CD에 어떻게 통합하나요?',
          'BuildKit은 무엇이고 어떤 장점이 있나요?',
          '이미지 태깅 전략을 설명해주세요'
        ],
        keyConceptsToProbe: [
          'Jenkins/GitHub Actions에서 docker build, registry push 자동화',
          'BuildKit은 병렬 빌드, 캐시 최적화, 보안 향상 (DOCKER_BUILDKIT=1)',
          'latest 외에 semantic version, git sha, env 태그 사용'
        ],
        followUpAngles: [
          'Docker Registry는 어떻게 구축하나요?',
          'Image scanning을 CI에 통합한 경험은?',
          'Blue-Green 배포를 Docker로 구현한 경험은?'
        ],
        tags: ['cicd', 'buildkit', 'registry', 'automation']
      }
    ]
  },
  commonMistakes: [
    'latest 태그에만 의존: 버전 관리 어려움',
    'root 유저로 컨테이너 실행: 보안 취약',
    '한 컨테이너에 여러 프로세스: 로그/재시작 관리 어려움',
    'Dockerfile에 민감 정보 하드코딩: 이미지에 포함됨'
  ],
  bestPractices: [
    '멀티스테이지 빌드로 이미지 크기 최소화',
    '.dockerignore로 불필요한 파일 제외',
    'alpine 등 경량 베이스 이미지 사용',
    'Named Volume으로 데이터 영속성 관리'
  ],
  relatedTechnologies: ['kubernetes', 'docker-compose', 'containerd', 'podman', 'ci-cd']
};

export default dockerKnowledge;
