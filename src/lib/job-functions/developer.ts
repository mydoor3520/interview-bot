import type { JobFunctionConfig } from './types';

export const developerConfig: JobFunctionConfig = {
  id: 'developer',
  label: '개발',
  description: '소프트웨어 개발자를 위한 기술 면접',
  icon: 'code',

  presetTopics: [
    { category: 'Backend', topics: ['Java', 'Spring', 'Node.js', 'Python', 'Go'] },
    { category: 'Frontend', topics: ['JavaScript/TypeScript', 'React', 'Next.js', 'Vue', 'HTML/CSS'] },
    { category: 'Architecture', topics: ['디자인 패턴', '시스템 설계', 'MSA', 'DDD', '클린 아키텍처'] },
    { category: 'Database', topics: ['SQL/RDBMS', 'NoSQL', 'ORM', '인덱싱/최적화'] },
    { category: 'Infrastructure', topics: ['Docker/K8s', 'CI/CD', 'AWS/Cloud', '모니터링'] },
    { category: 'AI/ML', topics: ['LLM/프롬프트 엔지니어링', 'RAG/벡터DB', 'MLOps', '머신러닝 기초', '딥러닝'] },
    { category: 'CS Fundamentals', topics: ['운영체제', '네트워크', '자료구조/알고리즘'] },
  ],

  behavioralTopics: [
    { category: '인성 기본', topics: ['자기소개', '프로젝트 경험', '협업/갈등', '리더십', '커리어 비전'] },
    { category: '인성 심화', topics: ['조직문화 적합성', '직업윤리', '스트레스 대처', '지원동기', '상황판단'] },
  ],

  skillCategories: [
    { key: 'language', label: '언어', items: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Go', 'Rust', 'C', 'C++', 'C#', 'Swift', 'Ruby', 'PHP', 'Scala', 'Dart'] },
    { key: 'framework', label: '프레임워크', items: ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Express', 'NestJS', 'Spring Boot', 'Django', 'FastAPI', 'Flask', 'Rails', 'Laravel', 'Flutter', 'React Native'] },
    { key: 'database', label: '데이터베이스', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Firebase', 'Elasticsearch', 'Neo4j', 'Cassandra'] },
    { key: 'infra', label: '인프라', items: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'GitHub Actions', 'Jenkins', 'Nginx', 'Linux'] },
    { key: 'ai', label: 'AI/ML', items: ['PyTorch', 'TensorFlow', 'LangChain', 'LlamaIndex', 'Hugging Face', 'OpenAI API', 'Claude API', 'RAG', 'Vector DB', 'MLflow', 'Kubeflow', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter'] },
    { key: 'tool', label: '도구', items: ['Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'Notion', 'Slack', 'VS Code', 'IntelliJ', 'Webpack', 'Vite', 'Storybook'] },
  ],

  interviewerPersona: '당신은 경험이 풍부한 시니어 개발자이자 기술 면접관입니다.\n아래 지원자의 프로필을 참고하여, 맞춤형 기술 면접을 진행해주세요.',

  difficultyDescriptions: {
    junior: '주니어 레벨 (1-3년차). 기본 개념, 문법, 기초 설계에 대한 질문을 하세요.',
    mid: '미들 레벨 (4-7년차). 심화 개념, 설계 패턴, 성능 최적화에 대한 질문을 하세요.',
    senior: '시니어 레벨 (8년차 이상). 아키텍처 설계, 대규모 시스템, 기술 리더십에 대한 질문을 하세요.',
  },

  questionCategories: ['기술심화', '프로젝트경험', '시스템설계', '인성문화핏', '직무적합성'],
  categoryDistribution: '카테고리별 분포: 기술심화 4-6개, 프로젝트경험 3-4개, 시스템설계 2-3개, 인성문화핏 3-4개, 직무적합성 2-3개',
  evaluationExpertType: '기술 면접 평가 전문가',

  companyStyles: ['naver', 'kakao', 'coupang', 'toss', 'line', 'samsung-sds', 'startup'],
};
