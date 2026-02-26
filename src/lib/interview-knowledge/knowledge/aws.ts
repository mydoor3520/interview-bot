import type { TechKnowledgeBase } from '../types';

const awsKnowledge: TechKnowledgeBase = {
  techId: 'aws',
  displayName: 'AWS',
  category: 'infra',
  version: '2024',
  topics: {
    junior: [
      {
        id: 'aws-compute-storage',
        topic: 'EC2/S3/RDS 기초',
        description: '핵심 컴퓨팅/스토리지 서비스',
        sampleQuestions: [
          'EC2 인스턴스 타입은 어떻게 선택하나요?',
          'S3의 스토리지 클래스를 설명해주세요',
          'RDS와 자체 DB 운영의 차이는 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'EC2: t-시리즈 (범용), c-시리즈 (CPU), r-시리즈 (메모리)',
          'S3: Standard (자주 접근), IA (드물게), Glacier (아카이브)',
          'RDS는 자동 백업/패치, 관리형 서비스'
        ],
        followUpAngles: [
          'EBS vs Instance Store의 차이는?',
          'S3 버킷 정책과 IAM 정책의 차이는?',
          'RDS Multi-AZ와 Read Replica의 차이는?'
        ],
        tags: ['ec2', 's3', 'rds', 'compute', 'storage']
      },
      {
        id: 'aws-iam-basics',
        topic: 'IAM 기본',
        description: '권한 및 보안 관리',
        sampleQuestions: [
          'IAM User, Group, Role의 차이는?',
          'Least Privilege 원칙은 무엇인가요?',
          'IAM Policy 구조를 설명해주세요'
        ],
        keyConceptsToProbe: [
          'User는 사람, Role은 서비스/리소스, Group은 User 묶음',
          'Least Privilege는 필요한 최소 권한만 부여',
          'Policy: Effect (Allow/Deny), Action, Resource, Condition'
        ],
        followUpAngles: [
          'Access Key vs IAM Role 선택 기준은?',
          'MFA는 어떻게 활성화하나요?',
          'STS (Security Token Service)의 역할은?'
        ],
        tags: ['iam', 'security', 'policy', 'permissions']
      },
      {
        id: 'aws-vpc-basics',
        topic: 'VPC 네트워킹 기초',
        description: '가상 네트워크 구성',
        sampleQuestions: [
          'VPC, Subnet, Route Table의 관계는?',
          'Public Subnet과 Private Subnet의 차이는?',
          'Security Group과 NACL의 차이는?'
        ],
        keyConceptsToProbe: [
          'VPC는 격리된 네트워크, Subnet은 CIDR 블록 분할',
          'Public은 IGW 연결, Private은 NAT Gateway 필요',
          'Security Group은 상태 기반 (stateful), NACL은 무상태 (stateless)'
        ],
        followUpAngles: [
          'Internet Gateway vs NAT Gateway의 차이는?',
          'Elastic IP는 언제 사용하나요?',
          'VPC Peering vs Transit Gateway는?'
        ],
        tags: ['vpc', 'subnet', 'security-group', 'networking']
      }
    ],
    mid: [
      {
        id: 'aws-serverless',
        topic: '서버리스 (Lambda/API Gateway)',
        description: '이벤트 기반 아키텍처',
        sampleQuestions: [
          'Lambda의 장단점은 무엇인가요?',
          'API Gateway의 역할은?',
          'Cold Start 문제를 어떻게 해결하나요?'
        ],
        keyConceptsToProbe: [
          'Lambda 장점: 자동 확장, 사용량 과금 / 단점: Cold Start, 실행 시간 제한',
          'API Gateway는 REST/HTTP API 엔드포인트, 인증/제한/캐싱',
          'Provisioned Concurrency, 작은 패키지 크기, 언어 선택'
        ],
        followUpAngles: [
          'Lambda Layer는 무엇이고 왜 사용하나요?',
          'Step Functions로 워크플로우 조율 경험은?',
          'EventBridge vs SNS vs SQS 선택 기준은?'
        ],
        tags: ['lambda', 'api-gateway', 'serverless', 'cold-start']
      },
      {
        id: 'aws-container',
        topic: '컨테이너 (ECS/EKS)',
        description: 'Docker 오케스트레이션',
        sampleQuestions: [
          'ECS와 EKS의 차이는?',
          'Fargate를 사용하는 이유는?',
          'ECR은 무엇인가요?'
        ],
        keyConceptsToProbe: [
          'ECS는 AWS 고유, EKS는 Kubernetes 표준',
          'Fargate는 서버리스 컨테이너, EC2 관리 불필요',
          'ECR은 Docker 이미지 레지스트리'
        ],
        followUpAngles: [
          'ECS Task Definition과 Service의 차이는?',
          'ALB vs NLB 선택 기준은?',
          'Service Mesh (App Mesh) 사용 경험은?'
        ],
        tags: ['ecs', 'eks', 'fargate', 'containers']
      },
      {
        id: 'aws-monitoring',
        topic: '모니터링 (CloudWatch/X-Ray)',
        description: '로그/메트릭/트레이싱',
        sampleQuestions: [
          'CloudWatch Logs vs Metrics의 차이는?',
          'X-Ray로 무엇을 추적할 수 있나요?',
          'CloudWatch Alarm은 어떻게 설정하나요?'
        ],
        keyConceptsToProbe: [
          'Logs는 텍스트 로그, Metrics는 수치 데이터',
          'X-Ray는 분산 트레이싱, 서비스 간 호출 추적',
          'Alarm: Metric 임계값, SNS로 알림'
        ],
        followUpAngles: [
          'CloudWatch Insights 쿼리 경험은?',
          'Custom Metric을 어떻게 전송하나요?',
          'AWS Config로 리소스 변경 추적 경험은?'
        ],
        tags: ['cloudwatch', 'x-ray', 'monitoring', 'logging']
      }
    ],
    senior: [
      {
        id: 'aws-architecture',
        topic: '대규모 아키텍처 설계',
        description: 'Well-Architected Framework',
        sampleQuestions: [
          'AWS Well-Architected Framework의 5개 기둥은?',
          '대규모 트래픽 처리 아키텍처를 설계한 경험은?',
          'Event-Driven Architecture를 AWS로 구현한 경험은?'
        ],
        keyConceptsToProbe: [
          '5 Pillars: Operational Excellence, Security, Reliability, Performance, Cost',
          'Auto Scaling, CloudFront, ElastiCache, Read Replica',
          'EventBridge, SNS, SQS, Lambda로 비동기 처리'
        ],
        followUpAngles: [
          'CQRS 패턴을 AWS로 구현한다면?',
          'Multi-Region 아키텍처 경험은?',
          'Serverless vs Container 선택 기준은?'
        ],
        tags: ['architecture', 'well-architected', 'event-driven', 'scalability']
      },
      {
        id: 'aws-cost-optimization',
        topic: '비용 최적화',
        description: '클라우드 비용 절감',
        sampleQuestions: [
          'AWS 비용을 절감한 경험을 말씀해주세요',
          'Reserved Instance vs Savings Plan의 차이는?',
          'Cost Explorer로 어떤 인사이트를 얻었나요?'
        ],
        keyConceptsToProbe: [
          'RI는 특정 인스턴스 타입, Savings Plan은 사용량 커밋',
          'S3 Lifecycle 정책, EBS 스냅샷 정리, 미사용 리소스 제거',
          'Cost Allocation Tags, 부서별 비용 분석'
        ],
        followUpAngles: [
          'Spot Instance를 프로덕션에서 사용한 경험은?',
          'Trusted Advisor 권장 사항을 적용한 사례는?',
          'FinOps 관점에서 비용 최적화 프로세스는?'
        ],
        tags: ['cost-optimization', 'reserved-instance', 'savings-plan', 'finops']
      },
      {
        id: 'aws-disaster-recovery',
        topic: '재해 복구/고가용성',
        description: 'RTO/RPO 설계',
        sampleQuestions: [
          'RTO와 RPO의 차이는?',
          'Multi-AZ vs Multi-Region 전략은?',
          'Disaster Recovery 시나리오를 설계한 경험은?'
        ],
        keyConceptsToProbe: [
          'RTO는 복구 시간, RPO는 데이터 손실 허용 시간',
          'Multi-AZ는 고가용성 (자동 failover), Multi-Region은 재해 복구',
          'Backup/Restore, Pilot Light, Warm Standby, Multi-Site'
        ],
        followUpAngles: [
          'Route 53 Health Check와 Failover 설정은?',
          'Database 백업 전략은?',
          'DR 훈련을 실제로 수행한 경험은?'
        ],
        tags: ['disaster-recovery', 'high-availability', 'rto', 'rpo']
      }
    ]
  },
  commonMistakes: [
    'IAM 과다 권한: 루트 계정 사용, admin 권한 남발',
    '보안 그룹 오설정: 0.0.0.0/0 포트 전체 오픈',
    '비용 모니터링 미흡: 예산 알림 미설정, 미사용 리소스 방치',
    '가용영역 미분산: 단일 AZ에 모든 리소스 집중'
  ],
  bestPractices: [
    '최소 권한 원칙 (IAM Role 활용, Access Key 최소화)',
    'IaC (Infrastructure as Code) - CloudFormation, CDK, Terraform',
    '멀티 AZ 배포로 고가용성 확보',
    '태깅 전략으로 리소스 관리 (Environment, Owner, CostCenter)'
  ],
  relatedTechnologies: ['terraform', 'docker', 'kubernetes', 'cloudformation', 'cdk']
};

export default awsKnowledge;
