export interface TechCategory {
  key: string;
  label: string;
  items: string[];
}

export const TECH_CATEGORIES: TechCategory[] = [
  {
    key: 'language',
    label: '언어',
    items: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Go', 'Rust',
      'C', 'C++', 'C#', 'Swift', 'Ruby', 'PHP', 'Scala', 'Dart',
    ],
  },
  {
    key: 'framework',
    label: '프레임워크',
    items: [
      'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Express', 'NestJS',
      'Spring Boot', 'Django', 'FastAPI', 'Flask', 'Rails', 'Laravel',
      'Flutter', 'React Native',
    ],
  },
  {
    key: 'database',
    label: '데이터베이스',
    items: [
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB',
      'Firebase', 'Elasticsearch', 'Neo4j', 'Cassandra',
    ],
  },
  {
    key: 'infra',
    label: '인프라',
    items: [
      'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform',
      'GitHub Actions', 'Jenkins', 'Nginx', 'Linux',
    ],
  },
  {
    key: 'ai',
    label: 'AI/ML',
    items: [
      'PyTorch', 'TensorFlow', 'LangChain', 'LlamaIndex', 'Hugging Face',
      'OpenAI API', 'Claude API', 'RAG', 'Vector DB', 'MLflow',
      'Kubeflow', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter',
    ],
  },
  {
    key: 'tool',
    label: '도구',
    items: [
      'Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'Notion',
      'Slack', 'VS Code', 'IntelliJ', 'Webpack', 'Vite', 'Storybook',
    ],
  },
];

export const PROFICIENCY_LABELS: Record<number, string> = {
  1: '입문',
  2: '초급',
  3: '중급',
  4: '숙련',
  5: '전문가',
};

export const DEFAULT_PROFICIENCY = 3;

export const CATEGORY_LABELS: Record<string, string> = {
  // Developer
  language: '언어',
  framework: '프레임워크',
  database: '데이터베이스',
  infra: '인프라',
  ai: 'AI/ML',
  tool: '도구',
  // Marketer
  channel: '채널',
  content: '콘텐츠',
  // Designer
  'design-tool': '디자인 도구',
  prototyping: '프로토타이핑',
  research: '리서치',
  'dev-skill': '개발 스킬',
  // PM
  'pm-tool': 'PM 도구',
  analytics: '애널리틱스',
  design: '디자인',
  methodology: '방법론',
  // General
  office: '오피스',
  data: '데이터',
  communication: '커뮤니케이션',
  // Common
  skill: '스킬',
  other: '기타',
};
