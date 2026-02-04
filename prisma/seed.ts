import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const presetTopics = [
  // JavaScript / TypeScript
  { name: "JavaScript 기초", category: "JavaScript", description: "변수, 타입, 함수, 스코프, 클로저" },
  { name: "JavaScript 심화", category: "JavaScript", description: "프로토타입, 이벤트 루프, 비동기 처리, 메모리 관리" },
  { name: "TypeScript", category: "TypeScript", description: "타입 시스템, 제네릭, 유틸리티 타입, 고급 패턴" },

  // React / Frontend
  { name: "React 기초", category: "React", description: "컴포넌트, Props, State, 라이프사이클" },
  { name: "React 심화", category: "React", description: "Hooks, Context, 성능 최적화, 패턴" },
  { name: "Next.js", category: "React", description: "App Router, SSR/SSG, 미들웨어, API Routes" },
  { name: "HTML/CSS", category: "Frontend", description: "시맨틱 HTML, Flexbox, Grid, 반응형 디자인" },

  // Backend
  { name: "Node.js", category: "Backend", description: "이벤트 루프, 스트림, 클러스터, 성능" },
  { name: "Express/NestJS", category: "Backend", description: "미들웨어, DI, 데코레이터, 모듈 시스템" },
  { name: "REST API 설계", category: "Backend", description: "REST 원칙, 버전 관리, 에러 처리, 인증" },
  { name: "GraphQL", category: "Backend", description: "스키마, 리졸버, 쿼리 최적화, 구독" },

  // Java / Spring
  { name: "Java 기초", category: "Java", description: "OOP, 컬렉션, 예외 처리, 제네릭" },
  { name: "Java 심화", category: "Java", description: "JVM 내부, 동시성, 메모리 모델, GC" },
  { name: "Spring Boot", category: "Java", description: "IoC/DI, AOP, Spring MVC, Security" },
  { name: "Spring 심화", category: "Java", description: "JPA/Hibernate, 트랜잭션, 배치, 캐싱" },

  // Python
  { name: "Python 기초", category: "Python", description: "자료형, 함수, 클래스, 모듈" },
  { name: "Python 심화", category: "Python", description: "데코레이터, 제너레이터, 메타클래스, 동시성" },
  { name: "Django/FastAPI", category: "Python", description: "ORM, 미들웨어, 비동기 처리, 테스트" },

  // Database
  { name: "SQL", category: "Database", description: "쿼리 최적화, 인덱스, 조인, 서브쿼리" },
  { name: "데이터베이스 설계", category: "Database", description: "정규화, ERD, 파티셔닝, 샤딩" },
  { name: "NoSQL", category: "Database", description: "MongoDB, Redis, DynamoDB 사용법 및 설계" },

  // DevOps / Infra
  { name: "Docker & Kubernetes", category: "DevOps", description: "컨테이너화, 오케스트레이션, 네트워킹" },
  { name: "CI/CD", category: "DevOps", description: "파이프라인 설계, 자동화, 배포 전략" },
  { name: "AWS", category: "Cloud", description: "EC2, S3, Lambda, RDS, CloudFront" },
  { name: "클라우드 아키텍처", category: "Cloud", description: "마이크로서비스, 서버리스, 이벤트 드리븐" },

  // CS Fundamentals
  { name: "자료구조", category: "CS", description: "배열, 링크드리스트, 트리, 그래프, 해시" },
  { name: "알고리즘", category: "CS", description: "정렬, 탐색, DP, 그리디, 분할정복" },
  { name: "운영체제", category: "CS", description: "프로세스, 스레드, 메모리, 파일시스템" },
  { name: "네트워크", category: "CS", description: "TCP/IP, HTTP, DNS, 로드밸런싱, CDN" },
  { name: "보안", category: "CS", description: "인증/인가, 암호화, OWASP Top 10, XSS/CSRF" },

  // Software Engineering
  { name: "디자인 패턴", category: "Engineering", description: "GoF 패턴, SOLID 원칙, 클린 코드" },
  { name: "시스템 설계", category: "Engineering", description: "확장성, 가용성, CAP 정리, 대규모 시스템" },
  { name: "테스팅", category: "Engineering", description: "단위 테스트, 통합 테스트, TDD, 모킹" },
  { name: "Git & 협업", category: "Engineering", description: "브랜칭 전략, 코드 리뷰, PR 작성법" },

  // Behavioral
  { name: "기술 리더십", category: "Behavioral", description: "팀 관리, 기술 의사결정, 멘토링" },
  { name: "문제 해결", category: "Behavioral", description: "트러블슈팅 경험, 장애 대응, 디버깅 전략" },
  { name: "프로젝트 경험", category: "Behavioral", description: "프로젝트 회고, 기여도, 성과 설명" },
];

async function main() {
  console.log("Seeding preset topics...");

  // Use createMany for better performance on first seed
  const existingCount = await prisma.topicConfig.count();
  if (existingCount === 0) {
    await prisma.topicConfig.createMany({
      data: presetTopics.map((topic) => ({
        name: topic.name,
        category: topic.category,
        description: topic.description,
        isPreset: true,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    console.log(`Created ${presetTopics.length} preset topics.`);
  } else {
    console.log(`Topics already exist (${existingCount}). Skipping seed.`);
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
