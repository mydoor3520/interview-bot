export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamOptions {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIChatResult {
  content: string;
  usage?: TokenUsage;
}

export interface AIClient {
  streamChat(options: AIStreamOptions): AsyncIterable<string>;
  chat(options: AIStreamOptions): Promise<AIChatResult>;
}

export interface QuestionResponse {
  question: string;
  category: string;
  difficulty: string;
  hints?: string[];
}

export interface EvaluationResponse {
  score: number;
  feedback: string;
  modelAnswer: string;
  strengths: string[];
  weaknesses: string[];
}

export interface SessionSummaryResponse {
  totalScore: number;
  summary: string;
  topicScores: Record<string, number>;
  overallStrengths: string[];
  overallWeaknesses: string[];
  recommendations: string[];
}

export interface ProfileContext {
  name: string;
  totalYearsExp: number;
  currentRole: string;
  currentCompany?: string;
  skills: Array<{ name: string; category: string; proficiency: number; yearsUsed?: number }>;
  experiences: Array<{ company: string; role: string; startDate: string; endDate?: string; description?: string; techStack: string[]; achievements: string[] }>;
  selfIntroduction?: string;
  resumeText?: string;
  strengths: string[];
  weaknesses: string[];
  targetPosition?: {
    company: string;
    position: string;
    jobDescription?: string;
    requirements: string[];
  };
}
