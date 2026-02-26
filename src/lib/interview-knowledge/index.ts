import type { TechKnowledgeBase, TechKnowledgeContext, DifficultyLevel, TopicNode } from './types';
import { mapDifficulty, buildPerSkillDifficultyHint } from './difficulty-mapper';

// Registry of available knowledge bases (lazy imports for tree-shaking)
// Note: Knowledge files will be created in Phase 8 - gracefully handled with try-catch until then
const KNOWLEDGE_REGISTRY: Record<string, () => Promise<{ default: TechKnowledgeBase }>> = {
  react: () => import('./knowledge/react'),
  'spring-boot': () => import('./knowledge/spring-boot'),
  nodejs: () => import('./knowledge/nodejs'),
  typescript: () => import('./knowledge/typescript'),
  aws: () => import('./knowledge/aws'),
  vue: () => import('./knowledge/vue'),
  angular: () => import('./knowledge/angular'),
  nextjs: () => import('./knowledge/nextjs'),
  django: () => import('./knowledge/django'),
  fastapi: () => import('./knowledge/fastapi'),
  java: () => import('./knowledge/java'),
  python: () => import('./knowledge/python'),
  go: () => import('./knowledge/go'),
  docker: () => import('./knowledge/docker'),
  kubernetes: () => import('./knowledge/kubernetes'),
  // Behavioral (인성면접)
  'behavioral-self-intro': () => import('./knowledge/behavioral-self-intro'),
  'behavioral-project': () => import('./knowledge/behavioral-project'),
  'behavioral-collaboration': () => import('./knowledge/behavioral-collaboration'),
  'behavioral-leadership': () => import('./knowledge/behavioral-leadership'),
  'behavioral-career': () => import('./knowledge/behavioral-career'),
  'behavioral-culture-fit': () => import('./knowledge/behavioral-culture-fit'),
  'behavioral-ethics': () => import('./knowledge/behavioral-ethics'),
  'behavioral-stress': () => import('./knowledge/behavioral-stress'),
  'behavioral-motivation': () => import('./knowledge/behavioral-motivation'),
  'behavioral-situational': () => import('./knowledge/behavioral-situational'),
};

// Map from user-facing topic names (from TECH_CATEGORIES) to techIds
const TOPIC_TO_TECH_MAP: Record<string, string> = {
  // Language
  'TypeScript': 'typescript',
  'Java': 'java',
  'Python': 'python',
  'Go': 'go',

  // Framework
  'React': 'react',
  'Next.js': 'nextjs', // Now has dedicated knowledge file
  'Vue': 'vue',
  'Vue.js': 'vue',
  'Angular': 'angular',
  'Spring Boot': 'spring-boot',
  'Express': 'nodejs',
  'NestJS': 'nodejs',
  'Django': 'django',
  'FastAPI': 'fastapi',

  // Infra
  'AWS': 'aws',
  'Docker': 'docker',
  'Kubernetes': 'kubernetes',
  'Docker/K8s': 'docker', // Map composite topic to docker (K8s gets picked up separately)
  'Node.js': 'nodejs', // Sometimes listed as infra/runtime

  // Behavioral (인성면접)
  '자기소개/지원동기': 'behavioral-self-intro',
  '자기소개': 'behavioral-self-intro',
  '프로젝트 경험': 'behavioral-project',
  '협업/갈등': 'behavioral-collaboration',
  '협업/갈등 해결': 'behavioral-collaboration',
  '리더십': 'behavioral-leadership',
  '리더십/팔로워십': 'behavioral-leadership',
  '커리어 비전': 'behavioral-career',
  '조직문화 적합성': 'behavioral-culture-fit',
  '조직문화': 'behavioral-culture-fit',
  '직업윤리': 'behavioral-ethics',
  '스트레스/위기 관리': 'behavioral-stress',
  '스트레스 대처': 'behavioral-stress',
  '지원동기/회사 이해도': 'behavioral-motivation',
  '지원동기': 'behavioral-motivation',
  '상황판단/의사결정': 'behavioral-situational',
  '상황판단': 'behavioral-situational',
};

// Known cross-tech topic combinations
const CROSS_TECH_COMBINATIONS: Record<string, string[]> = {
  'angular+typescript': [
    'Angular의 TypeScript 데코레이터 활용',
    'Strict mode 설정과 타입 안전성',
    'RxJS 타입 정의와 제네릭 활용',
  ],
  'django+python': [
    'Django ORM 고급 쿼리와 Python 타입 힌트',
    'Python async/await와 Django Channels',
    '테스트 주도 개발 with pytest + Django',
  ],
  'docker+kubernetes': [
    'Docker 이미지 최적화와 K8s 배포 전략',
    '컨테이너 오케스트레이션 패턴',
    'CI/CD 파이프라인 with Docker + K8s',
  ],
  'fastapi+python': [
    'FastAPI의 Pydantic 모델과 Python 타입 시스템',
    '비동기 프로그래밍 패턴 (asyncio + FastAPI)',
    '의존성 주입과 테스트 전략',
  ],
  'go+docker': [
    'Go 멀티스테이지 빌드 최적화',
    'Go 마이크로서비스 컨테이너화 전략',
    'gRPC 서비스 Docker 배포 패턴',
  ],
  'go+kubernetes': [
    'Go Operator 패턴과 커스텀 컨트롤러',
    'client-go를 활용한 K8s 리소스 관리',
    'Go 기반 K8s 네이티브 애플리케이션 설계',
  ],
  'java+spring-boot': [
    'Spring Boot 내부 동작 원리와 자동 설정',
    'JVM 메모리 관리와 Spring Bean 라이프사이클',
    'Java 최신 기능 (Records, Sealed Classes)과 Spring 통합',
  ],
  'nextjs+react': [
    'Next.js App Router와 React Server Components',
    '서버/클라이언트 컴포넌트 경계 설계',
    '데이터 페칭 패턴 (Server Actions vs API Routes)',
  ],
  'nodejs+aws': [
    'Lambda 함수로 Node.js 서버리스 아키텍처 구성',
    'API Gateway + Lambda 통합',
    'DynamoDB와 Node.js SDK 활용',
  ],
  'nodejs+typescript': [
    'Node.js 런타임과 TypeScript 타입 시스템 통합',
    'Express/NestJS 타입 안전 미들웨어 패턴',
    'tsconfig.json 최적 설정과 빌드 파이프라인',
  ],
  'react+nodejs': [
    '풀스택 JavaScript 애플리케이션 아키텍처',
    'SSR vs CSR: Next.js와 Express 통합',
    'API 통신 및 상태 관리 패턴',
  ],
  'react+typescript': [
    'TypeScript와 React의 타입 정의 패턴 (props, state, hooks)',
    'Generic 컴포넌트 작성 및 타입 안전성 보장',
    'React.FC vs 함수형 컴포넌트 타입 정의 차이',
  ],
  'spring-boot+aws': [
    'Spring Boot 애플리케이션의 AWS 배포 전략 (ECS, EKS, Elastic Beanstalk)',
    'AWS 서비스 통합 (S3, SQS, SNS, RDS)',
    'Auto Scaling 및 Health Check 설정',
  ],
  'vue+typescript': [
    'Vue 3 Composition API와 TypeScript 통합',
    'defineComponent vs script setup 타입 추론',
    'Pinia 스토어 타입 정의와 제네릭 활용',
  ],
};

/**
 * Get all available tech IDs for UI listing
 */
export function getAvailableTechIds(): string[] {
  return Object.keys(KNOWLEDGE_REGISTRY);
}

/**
 * Resolve topic names to tech IDs
 */
export function resolveTechIds(topics: string[]): string[] {
  const techIds = new Set<string>();

  for (const topic of topics) {
    const techId = TOPIC_TO_TECH_MAP[topic];
    if (techId && KNOWLEDGE_REGISTRY[techId]) {
      techIds.add(techId);
    }
  }

  return Array.from(techIds);
}

/**
 * Generate cross-tech topics for known technology combinations
 */
function generateCrossTechTopics(techIds: string[]): string[] {
  const sortedIds = [...techIds].sort();
  const crossTopics: string[] = [];

  // Check all combinations
  for (let i = 0; i < sortedIds.length; i++) {
    for (let j = i + 1; j < sortedIds.length; j++) {
      const key = `${sortedIds[i]}+${sortedIds[j]}`;
      const topics = CROSS_TECH_COMBINATIONS[key];
      if (topics) {
        crossTopics.push(...topics);
      }
    }
  }

  return crossTopics;
}

/**
 * Load knowledge bases for a session
 *
 * @param topics - User-facing topic names (from TECH_CATEGORIES)
 * @param difficulty - Session difficulty level
 * @param userSkills - Optional per-tech proficiency levels
 * @returns TechKnowledgeContext for prompt injection
 */
export async function loadKnowledgeForSession(
  topics: string[],
  difficulty: DifficultyLevel,
  userSkills?: Array<{ tech: string; proficiency: number }>
): Promise<TechKnowledgeContext> {
  // Resolve topic names to tech IDs
  const techIds = resolveTechIds(topics);

  if (techIds.length === 0) {
    return {
      technologies: [],
      crossTechTopics: [],
      difficultyMapping: {},
    };
  }

  // Dynamically import only the needed knowledge bases
  const knowledgeBases: TechKnowledgeBase[] = [];

  for (const techId of techIds) {
    try {
      const loader = KNOWLEDGE_REGISTRY[techId];
      if (loader) {
        const module = await loader();
        knowledgeBases.push(module.default);
      }
    } catch (error) {
      // Knowledge file doesn't exist yet - skip gracefully
      console.warn(`Failed to load knowledge base for ${techId}:`, error);
    }
  }

  // Build difficulty mapping per tech
  const difficultyMapping: Record<string, { topicLevel: DifficultyLevel; questionDepth: number }> = {};

  if (userSkills && userSkills.length > 0) {
    // Per-skill difficulty adjustment
    for (const skill of userSkills) {
      const techId = TOPIC_TO_TECH_MAP[skill.tech];
      if (techId) {
        const mapping = mapDifficulty(difficulty, skill.proficiency);
        difficultyMapping[techId] = {
          topicLevel: mapping.topicSelection,
          questionDepth: mapping.questionDepth,
        };
      }
    }
  } else {
    // Default: use session difficulty for all techs
    for (const techId of techIds) {
      difficultyMapping[techId] = {
        topicLevel: difficulty,
        questionDepth: difficulty === 'junior' ? 1 : difficulty === 'mid' ? 2 : 3,
      };
    }
  }

  // Filter topics by difficulty level
  const technologies = knowledgeBases.map((kb) => {
    const mapping = difficultyMapping[kb.techId] || { topicLevel: difficulty, questionDepth: 2 };
    const filteredTopics = kb.topics[mapping.topicLevel] || [];

    return {
      techId: kb.techId,
      displayName: kb.displayName,
      topics: filteredTopics,
      commonMistakes: kb.commonMistakes,
      bestPractices: kb.bestPractices,
    };
  });

  // Generate cross-tech topics
  const crossTechTopics = generateCrossTechTopics(techIds);

  return {
    technologies,
    crossTechTopics,
    difficultyMapping,
  };
}

/**
 * Check if a topic has a knowledge base
 */
export function hasKnowledgeBase(topicName: string): boolean {
  const techId = TOPIC_TO_TECH_MAP[topicName];
  return techId ? !!KNOWLEDGE_REGISTRY[techId] : false;
}

/**
 * Build context string for AI prompt injection
 */
export function buildContextForPrompt(
  context: TechKnowledgeContext,
  sessionDifficulty: DifficultyLevel,
  userSkills?: Array<{ tech: string; proficiency: number }>
): string {
  let prompt = '## 기술 지식 베이스\n\n';

  // Per-skill difficulty hints
  if (userSkills && userSkills.length > 0) {
    const difficultyHint = buildPerSkillDifficultyHint(userSkills, sessionDifficulty);
    if (difficultyHint) {
      prompt += `${difficultyHint}\n\n`;
    }
  }

  // Technology topics
  for (const tech of context.technologies) {
    prompt += `### ${tech.displayName}\n\n`;

    if (tech.topics.length > 0) {
      prompt += '**핵심 토픽:**\n';
      for (const topic of tech.topics) {
        prompt += `- ${topic.topic}: ${topic.description}\n`;
        if (topic.keyConceptsToProbe.length > 0) {
          prompt += `  - 확인할 개념: ${topic.keyConceptsToProbe.join(', ')}\n`;
        }
      }
      prompt += '\n';
    }

    if (tech.commonMistakes.length > 0) {
      prompt += `**흔한 실수:** ${tech.commonMistakes.join(', ')}\n\n`;
    }

    if (tech.bestPractices.length > 0) {
      prompt += `**모범 사례:** ${tech.bestPractices.join(', ')}\n\n`;
    }
  }

  // Cross-tech topics
  if (context.crossTechTopics.length > 0) {
    prompt += '### 통합 토픽\n\n';
    for (const topic of context.crossTechTopics) {
      prompt += `- ${topic}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}
