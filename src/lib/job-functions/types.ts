export interface TopicGroup {
  category: string;
  topics: string[];
}

export interface SkillCategory {
  key: string;
  label: string;
  items: string[];
}

export interface JobFunctionConfig {
  id: string;
  label: string;
  description: string;
  icon: string;

  // Interview topics
  presetTopics: TopicGroup[];
  behavioralTopics: TopicGroup[];

  // Skill categories (for profile/onboarding)
  skillCategories: SkillCategory[];

  // AI prompt context
  interviewerPersona: string;
  difficultyDescriptions: Record<string, string>;
  questionCategories: string[];
  categoryDistribution: string;
  evaluationExpertType: string;

  // Company styles (optional)
  companyStyles?: string[];
}
