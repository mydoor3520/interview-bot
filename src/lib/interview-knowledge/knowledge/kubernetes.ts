import type { TechKnowledgeBase } from '../types';

const kubernetesKnowledge: TechKnowledgeBase = {
  techId: 'kubernetes',
  displayName: 'Kubernetes',
  category: 'infra',
  version: '1.31',
  topics: {
    junior: [
      {
        id: 'k8s-pod-deployment',
        topic: 'Pod, Deployment, Service 기초',
        description: 'Kubernetes 핵심 리소스',
        sampleQuestions: [
          'Pod는 무엇이고 왜 컨테이너를 직접 실행하지 않나요?',
          'Deployment와 ReplicaSet의 관계는?',
          'Service의 타입(ClusterIP, NodePort, LoadBalancer)을 설명해주세요'
        ],
        keyConceptsToProbe: [
          'Pod는 컨테이너 그룹의 최소 배포 단위, IP/볼륨 공유',
          'Deployment는 ReplicaSet을 관리, 롤링 업데이트 지원',
          'ClusterIP(내부), NodePort(노드 포트 노출), LoadBalancer(외부 LB)'
        ],
        followUpAngles: [
          'Pod 내 여러 컨테이너는 언제 사용하나요?',
          'StatefulSet은 Deployment와 어떻게 다른가요?',
          'Headless Service는 무엇인가요?'
        ],
        tags: ['pod', 'deployment', 'service', 'replicaset']
      },
      {
        id: 'k8s-configmap-secret',
        topic: 'ConfigMap과 Secret',
        description: '설정과 민감 정보 관리',
        sampleQuestions: [
          'ConfigMap은 무엇이고 어떻게 사용하나요?',
          'Secret과 ConfigMap의 차이는?',
          'Secret은 정말 안전한가요?'
        ],
        keyConceptsToProbe: [
          'ConfigMap은 키-값 설정, 환경 변수나 볼륨으로 주입',
          'Secret은 base64 인코딩, 민감 정보용 (완전히 암호화는 아님)',
          'etcd 암호화, RBAC, 외부 시크릿 관리 도구 권장'
        ],
        followUpAngles: [
          'volumeMount로 ConfigMap을 파일로 마운트하려면?',
          'Secret을 환경 변수로 주입하는 방법은?',
          'Sealed Secrets는 무엇인가요?'
        ],
        tags: ['configmap', 'secret', 'configuration', 'security']
      },
      {
        id: 'k8s-kubectl',
        topic: 'kubectl 명령어 활용',
        description: '클러스터 관리 CLI',
        sampleQuestions: [
          'kubectl get, describe, logs의 차이는?',
          'kubectl apply와 kubectl create의 차이는?',
          'Pod 내부에 접속하려면 어떻게 하나요?'
        ],
        keyConceptsToProbe: [
          'get은 목록, describe는 상세 정보, logs는 컨테이너 로그',
          'apply는 선언적(YAML 기반), create는 명령적(직접 생성)',
          'kubectl exec -it pod-name -- /bin/sh'
        ],
        followUpAngles: [
          'kubectl port-forward는 무엇인가요?',
          '-o yaml과 -o json의 활용은?',
          'context와 namespace 전환은 어떻게 하나요?'
        ],
        tags: ['kubectl', 'cli', 'commands', 'management']
      }
    ],
    mid: [
      {
        id: 'k8s-ingress',
        topic: 'Ingress와 네트워킹',
        description: 'L7 로드 밸런싱과 라우팅',
        sampleQuestions: [
          'Ingress는 무엇이고 Service와 어떻게 다른가요?',
          'Ingress Controller는 무엇인가요?',
          'Path 기반 라우팅은 어떻게 설정하나요?'
        ],
        keyConceptsToProbe: [
          'Ingress는 HTTP/HTTPS 라우팅 규칙, Service는 L4',
          'Ingress Controller(nginx, traefik)가 규칙 구현',
          'rules에 host, path 지정해 서로 다른 Service로 라우팅'
        ],
        followUpAngles: [
          'TLS 인증서는 어떻게 설정하나요?',
          'Cert-manager는 무엇인가요?',
          'Network Policy로 Pod 간 통신을 제어하는 방법은?'
        ],
        tags: ['ingress', 'networking', 'routing', 'load-balancing']
      },
      {
        id: 'k8s-autoscaling',
        topic: '오토스케일링',
        description: 'HPA, VPA, Cluster Autoscaler',
        sampleQuestions: [
          'HPA(Horizontal Pod Autoscaler)는 어떻게 동작하나요?',
          'VPA(Vertical Pod Autoscaler)는 언제 사용하나요?',
          'Cluster Autoscaler는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'HPA는 메트릭 기반으로 Pod 개수 조정 (CPU, 메모리, 커스텀)',
          'VPA는 Pod 리소스 요청/제한 자동 조정',
          'Cluster Autoscaler는 노드 부족 시 클러스터 확장'
        ],
        followUpAngles: [
          'Metrics Server는 무엇인가요?',
          'HPA와 VPA를 함께 사용할 수 있나요?',
          'KEDA는 무엇인가요?'
        ],
        tags: ['autoscaling', 'hpa', 'vpa', 'metrics']
      },
      {
        id: 'k8s-helm',
        topic: 'Helm과 Kustomize',
        description: '패키지 관리와 템플릿',
        sampleQuestions: [
          'Helm은 무엇이고 왜 사용하나요?',
          'Helm Chart의 구조를 설명해주세요',
          'Kustomize와 Helm의 차이는?'
        ],
        keyConceptsToProbe: [
          'Helm은 K8s 패키지 매니저, 재사용 가능한 Chart로 배포',
          'Chart.yaml(메타), values.yaml(설정), templates/(YAML 템플릿)',
          'Kustomize는 오버레이 기반, Helm은 템플릿 기반'
        ],
        followUpAngles: [
          'helm upgrade --install은 무엇인가요?',
          'values.yaml을 환경별로 분리하는 방법은?',
          'Helmfile은 무엇인가요?'
        ],
        tags: ['helm', 'kustomize', 'package-management', 'templating']
      }
    ],
    senior: [
      {
        id: 'k8s-cluster-design',
        topic: '클러스터 아키텍처 설계',
        description: '고가용성, 멀티 테넌시, 보안',
        sampleQuestions: [
          'Control Plane 고가용성은 어떻게 구성하나요?',
          'Multi-tenancy 전략을 설명해주세요',
          'RBAC으로 권한을 어떻게 관리하나요?'
        ],
        keyConceptsToProbe: [
          'etcd 클러스터링, 여러 마스터 노드, LB로 API 서버 분산',
          'Namespace 분리, ResourceQuota, NetworkPolicy로 격리',
          'Role/ClusterRole로 권한 정의, RoleBinding으로 사용자/SA 연결'
        ],
        followUpAngles: [
          'etcd 백업/복구 전략은?',
          'PodSecurityPolicy와 PodSecurityStandards의 차이는?',
          'Service Mesh는 언제 도입하나요?'
        ],
        tags: ['architecture', 'ha', 'multi-tenancy', 'rbac']
      },
      {
        id: 'k8s-operator',
        topic: 'Operator 패턴',
        description: 'Custom Resource와 Controller',
        sampleQuestions: [
          'Kubernetes Operator는 무엇인가요?',
          'CRD(Custom Resource Definition)는 어떻게 만드나요?',
          'Operator를 직접 개발한 경험이 있나요?'
        ],
        keyConceptsToProbe: [
          'Operator는 CRD + Controller, 애플리케이션 지식을 코드화',
          'CRD로 커스텀 리소스 정의, kubectl로 관리 가능',
          'Operator SDK, Kubebuilder로 개발, Reconcile Loop 구현'
        ],
        followUpAngles: [
          'Finalizer는 무엇인가요?',
          'Webhook은 언제 사용하나요?',
          'Operator Lifecycle Manager는 무엇인가요?'
        ],
        tags: ['operator', 'crd', 'controller', 'custom-resource']
      },
      {
        id: 'k8s-multicluster',
        topic: '멀티클러스터와 서비스메시',
        description: 'Federation, Istio, 고급 네트워킹',
        sampleQuestions: [
          '멀티클러스터 아키텍처는 왜 필요한가요?',
          'Istio는 무엇을 해결하나요?',
          'Service Mesh의 사이드카 패턴을 설명해주세요'
        ],
        keyConceptsToProbe: [
          '지리적 분산, 장애 격리, 컴플라이언스, 클러스터 페더레이션',
          'Istio는 트래픽 관리, 보안(mTLS), 관찰성(분산 추적) 제공',
          '각 Pod에 Envoy 프록시 주입, 트래픽 가로채서 제어'
        ],
        followUpAngles: [
          'VirtualService와 DestinationRule은 무엇인가요?',
          'Circuit Breaker를 Istio로 구현하려면?',
          'Linkerd vs Istio 비교는?'
        ],
        tags: ['multicluster', 'istio', 'service-mesh', 'federation']
      }
    ]
  },
  commonMistakes: [
    'Resource Limits 미설정: OOM으로 노드 전체 영향',
    'Liveness/Readiness Probe 오설정: 무한 재시작 루프',
    'latest 태그 사용: 버전 관리 불가, 롤백 어려움',
    'Namespace 미사용: 리소스 충돌, 권한 관리 어려움'
  ],
  bestPractices: [
    'Labels과 Selectors로 리소스 조직화',
    'ResourceQuota와 LimitRange로 리소스 제한',
    'Health Check(liveness/readiness) 필수 설정',
    'GitOps(ArgoCD, Flux)로 선언적 배포'
  ],
  relatedTechnologies: ['docker', 'helm', 'istio', 'prometheus', 'argocd', 'terraform']
};

export default kubernetesKnowledge;
