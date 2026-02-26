/**
 * Normalizes tech stack names from job postings.
 * Maps Korean names, variant spellings, and abbreviations to canonical names.
 * Uses the existing TECH_CATEGORIES from src/lib/constants/tech-stacks.ts as the canonical set.
 */

// Korean → English mapping
const KOREAN_TECH_MAP: Record<string, string> = {
  // Languages
  '자바스크립트': 'JavaScript',
  '타입스크립트': 'TypeScript',
  '파이썬': 'Python',
  '자바': 'Java',
  '코틀린': 'Kotlin',
  '스위프트': 'Swift',
  '루비': 'Ruby',
  '러스트': 'Rust',
  '고': 'Go',
  '고랭': 'Go',
  '씨샵': 'C#',
  '다트': 'Dart',
  '스칼라': 'Scala',

  // Frameworks
  '리액트': 'React',
  '넥스트': 'Next.js',
  '넥스트제이에스': 'Next.js',
  '뷰': 'Vue.js',
  '앵귤러': 'Angular',
  '스벨트': 'Svelte',
  '스프링': 'Spring Boot',
  '스프링부트': 'Spring Boot',
  '장고': 'Django',
  '플라스크': 'Flask',
  '플러터': 'Flutter',
  '리액트네이티브': 'React Native',
  '익스프레스': 'Express',
  '네스트': 'NestJS',
  '라라벨': 'Laravel',
  '레일즈': 'Rails',

  // Databases
  '포스트그레스': 'PostgreSQL',
  '몽고디비': 'MongoDB',
  '마이에스큐엘': 'MySQL',
  '레디스': 'Redis',
  '엘라스틱서치': 'Elasticsearch',
  '파이어베이스': 'Firebase',
  '다이나모디비': 'DynamoDB',

  // Infra
  '도커': 'Docker',
  '쿠버네티스': 'Kubernetes',
  '테라폼': 'Terraform',
  '젠킨스': 'Jenkins',
  '깃허브액션': 'GitHub Actions',
  '깃허브': 'GitHub',
  '깃랩': 'GitLab',
  '엔진엑스': 'Nginx',
  '리눅스': 'Linux',

  // AI/ML
  '파이토치': 'PyTorch',
  '텐서플로': 'TensorFlow',
  '텐서플로우': 'TensorFlow',
  '랭체인': 'LangChain',
  '허깅페이스': 'Hugging Face',

  // Tools
  '깃': 'Git',
  '지라': 'Jira',
  '피그마': 'Figma',
  '노션': 'Notion',
  '슬랙': 'Slack',
  '웹팩': 'Webpack',
  '바이트': 'Vite',
  '스토리북': 'Storybook',
};

// English variant → canonical mapping
const VARIANT_TECH_MAP: Record<string, string> = {
  // JavaScript variants
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',

  // React variants
  'reactjs': 'React',
  'react.js': 'React',
  'react js': 'React',
  'nextjs': 'Next.js',
  'next': 'Next.js',
  'next.js': 'Next.js',
  'vuejs': 'Vue.js',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vue3': 'Vue.js',
  'angular': 'Angular',
  'angularjs': 'Angular',
  'svelte': 'Svelte',
  'sveltekit': 'Svelte',

  // Backend frameworks
  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'springboot': 'Spring Boot',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'express': 'Express',
  'expressjs': 'Express',
  'express.js': 'Express',
  'nestjs': 'NestJS',
  'nest.js': 'NestJS',
  'nest': 'NestJS',
  'rails': 'Rails',
  'ruby on rails': 'Rails',
  'ror': 'Rails',
  'laravel': 'Laravel',

  // Mobile
  'flutter': 'Flutter',
  'react native': 'React Native',
  'react-native': 'React Native',
  'rn': 'React Native',
  'kotlin': 'Kotlin',
  'swift': 'Swift',
  'dart': 'Dart',

  // Databases
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'pg': 'PostgreSQL',
  'mysql': 'MySQL',
  'mariadb': 'MySQL',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'sqlite': 'SQLite',
  'dynamodb': 'DynamoDB',
  'dynamo': 'DynamoDB',
  'elasticsearch': 'Elasticsearch',
  'elastic': 'Elasticsearch',
  'es': 'Elasticsearch',
  'firebase': 'Firebase',
  'neo4j': 'Neo4j',
  'cassandra': 'Cassandra',

  // Languages
  'python': 'Python',
  'py': 'Python',
  'java': 'Java',
  'go': 'Go',
  'golang': 'Go',
  'rust': 'Rust',
  'c': 'C',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'dotnet': 'C#',
  '.net': 'C#',
  'ruby': 'Ruby',
  'php': 'PHP',
  'scala': 'Scala',

  // Infra
  'docker': 'Docker',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'kube': 'Kubernetes',
  'aws': 'AWS',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'azure': 'Azure',
  'terraform': 'Terraform',
  'tf': 'Terraform',
  'github actions': 'GitHub Actions',
  'gh actions': 'GitHub Actions',
  'jenkins': 'Jenkins',
  'nginx': 'Nginx',
  'linux': 'Linux',
  'ubuntu': 'Linux',
  'centos': 'Linux',

  // AI/ML
  'pytorch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  'langchain': 'LangChain',
  'llamaindex': 'LlamaIndex',
  'llama index': 'LlamaIndex',
  'huggingface': 'Hugging Face',
  'hugging face': 'Hugging Face',
  'openai': 'OpenAI API',
  'gpt': 'OpenAI API',
  'claude': 'Claude API',
  'rag': 'RAG',
  'mlflow': 'MLflow',
  'kubeflow': 'Kubeflow',
  'scikit-learn': 'Scikit-learn',
  'sklearn': 'Scikit-learn',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'jupyter': 'Jupyter',

  // Tools
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'jira': 'Jira',
  'figma': 'Figma',
  'notion': 'Notion',
  'slack': 'Slack',
  'vscode': 'VS Code',
  'vs code': 'VS Code',
  'intellij': 'IntelliJ',
  'idea': 'IntelliJ',
  'webpack': 'Webpack',
  'vite': 'Vite',
  'storybook': 'Storybook',

  // Additional common tech
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'rest': 'REST API',
  'restful': 'REST API',
  'kafka': 'Kafka',
  'rabbitmq': 'RabbitMQ',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'prometheus': 'Prometheus',
  'grafana': 'Grafana',
  'datadog': 'Datadog',
  'sentry': 'Sentry',
};

export interface NormalizationResult {
  original: string;
  normalized: string;
  category: string | null; // category key from TECH_CATEGORIES, null if not found
  wasNormalized: boolean;
}

/**
 * Normalize a single tech name to its canonical form.
 */
export function normalizeTechName(raw: string): NormalizationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { original: raw, normalized: raw, category: null, wasNormalized: false };
  }

  const lower = trimmed.toLowerCase();

  // 1. Check Korean map
  if (KOREAN_TECH_MAP[trimmed]) {
    const normalized = KOREAN_TECH_MAP[trimmed];
    return { original: raw, normalized, category: findCategory(normalized), wasNormalized: true };
  }

  // 2. Check English variant map (case-insensitive)
  if (VARIANT_TECH_MAP[lower]) {
    const normalized = VARIANT_TECH_MAP[lower];
    return { original: raw, normalized, category: findCategory(normalized), wasNormalized: normalized !== trimmed };
  }

  // 3. Check if already a canonical name (case-insensitive match against TECH_CATEGORIES)
  const canonical = findCanonicalMatch(trimmed);
  if (canonical) {
    return { original: raw, normalized: canonical, category: findCategory(canonical), wasNormalized: canonical !== trimmed };
  }

  // 4. Unknown tech - return as-is with 'other' category
  return { original: raw, normalized: trimmed, category: 'other', wasNormalized: false };
}

/**
 * Normalize an array of tech stack names.
 * Deduplicates after normalization.
 */
export function normalizeTechStack(techStack: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tech of techStack) {
    const { normalized } = normalizeTechName(tech);
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }

  return result;
}

// Import TECH_CATEGORIES at the function level to find category
function findCategory(normalizedName: string): string | null {
  // Lazy import to avoid circular deps - use inline data
  const categories: Record<string, string[]> = {
    language: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Go', 'Rust', 'C', 'C++', 'C#', 'Swift', 'Ruby', 'PHP', 'Scala', 'Dart'],
    framework: ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Express', 'NestJS', 'Spring Boot', 'Django', 'FastAPI', 'Flask', 'Rails', 'Laravel', 'Flutter', 'React Native', 'Node.js'],
    database: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Firebase', 'Elasticsearch', 'Neo4j', 'Cassandra'],
    infra: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'GitHub Actions', 'Jenkins', 'Nginx', 'Linux', 'CI/CD'],
    ai: ['PyTorch', 'TensorFlow', 'LangChain', 'LlamaIndex', 'Hugging Face', 'OpenAI API', 'Claude API', 'RAG', 'Vector DB', 'MLflow', 'Kubeflow', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter'],
    tool: ['Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'Notion', 'Slack', 'VS Code', 'IntelliJ', 'Webpack', 'Vite', 'Storybook'],
  };

  for (const [key, items] of Object.entries(categories)) {
    if (items.some(item => item.toLowerCase() === normalizedName.toLowerCase())) {
      return key;
    }
  }
  return null;
}

function findCanonicalMatch(name: string): string | null {
  const lower = name.toLowerCase();
  const allTech = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Go', 'Rust', 'C', 'C++', 'C#', 'Swift', 'Ruby', 'PHP', 'Scala', 'Dart',
    'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Express', 'NestJS', 'Spring Boot', 'Django', 'FastAPI', 'Flask', 'Rails', 'Laravel', 'Flutter', 'React Native', 'Node.js',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Firebase', 'Elasticsearch', 'Neo4j', 'Cassandra',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'GitHub Actions', 'Jenkins', 'Nginx', 'Linux',
    'PyTorch', 'TensorFlow', 'LangChain', 'LlamaIndex', 'Hugging Face', 'OpenAI API', 'Claude API', 'RAG', 'MLflow', 'Kubeflow', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter',
    'Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'Notion', 'Slack', 'VS Code', 'IntelliJ', 'Webpack', 'Vite', 'Storybook',
    'GraphQL', 'gRPC', 'REST API', 'Kafka', 'RabbitMQ', 'Prometheus', 'Grafana', 'Datadog', 'Sentry',
  ];

  for (const tech of allTech) {
    if (tech.toLowerCase() === lower) {
      return tech;
    }
  }
  return null;
}
