import type { UserProfile, WorkExperience, UserSkill } from '@prisma/client';

export interface ResumeData {
  name: string;
  email?: string;
  currentRole: string;
  totalYearsExp: number;
  coreCompetencies: string[];  // 3-5, auto-generated from JD
  experiences: ResumeExperience[];
  skills: ResumeSkill[];
  summary?: string;  // mapped from UserProfile.selfIntroduction
  strengths?: string[];  // mapped from UserProfile.strengths
  targetCompany?: string;
  targetPosition?: string;
  photoUrl?: string;
}

export interface ResumeExperience {
  company: string;
  role: string;
  startDate: string;   // "YYYY-MM" format
  endDate?: string;     // "YYYY-MM" or undefined (currently employed)
  description: string;
  techStack: string[];
  achievements: string[];
  relevanceScore?: number;
}

export interface ResumeSkill {
  name: string;
  category: string;
  proficiency: number;  // 1-5
  yearsUsed?: number;
}

export type TemplateType = 'clean-modern' | 'professional' | 'executive';
export type SourceType = 'profile' | 'coaching';
export type OutputFormat = 'pdf' | 'docx' | 'both';

// Helper type for optimizer input
export type ProfileWithRelations = UserProfile & {
  skills: UserSkill[];
  experiences: WorkExperience[];
};
