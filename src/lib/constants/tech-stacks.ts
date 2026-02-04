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
  language: '언어',
  framework: '프레임워크',
  database: '데이터베이스',
  infra: '인프라',
  tool: '도구',
  other: '기타',
};
