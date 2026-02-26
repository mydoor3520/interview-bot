// Type definitions for the tech knowledge base system

export interface TechKnowledgeBase {
  techId: string;              // "react", "spring-boot", "kubernetes"
  displayName: string;         // "React"
  category: 'frontend' | 'backend' | 'language' | 'infra' | 'database' | 'behavioral';
  version: string;             // Knowledge base version tracking "2026.1"

  topics: {
    junior: TopicNode[];
    mid: TopicNode[];
    senior: TopicNode[];
  };

  commonMistakes: string[];
  bestPractices: string[];
  relatedTechnologies: string[];
}

export interface TopicNode {
  id: string;                  // "react-hooks-lifecycle"
  topic: string;               // "Hooks Lifecycle & Rules"
  description: string;         // Brief description for AI context
  sampleQuestions: string[];   // 2-3 example questions
  keyConceptsToProbe: string[];
  followUpAngles: string[];
  tags: string[];
}

export type DifficultyLevel = 'junior' | 'mid' | 'senior';

export interface TechKnowledgeContext {
  technologies: Array<{
    techId: string;
    displayName: string;
    topics: TopicNode[];
    commonMistakes: string[];
    bestPractices: string[];
  }>;
  crossTechTopics: string[];
  difficultyMapping: Record<string, { topicLevel: DifficultyLevel; questionDepth: number }>;
}

export interface CompanyInterviewStyle {
  companyId: string;
  displayName: string;
  description: string;

  interviewStructure: {
    rounds: string[];
    focusAreas: string[];
    timePerRound: string;
  };

  questionStyle: {
    emphasis: string[];
    avoidTopics: string[];
    styleGuide: string;
    exampleQuestions: string[];
  };

  evaluationCriteria: {
    topPriorities: string[];
    redFlags: string[];
    greenFlags: string[];
  };

  culture: {
    values: string[];
    teamStructure: string;
    techStack: string[];
  };
}
