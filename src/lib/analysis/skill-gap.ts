/**
 * Skill-gap analysis: compares user skills with position requirements.
 * Used to recommend interview topics and highlight areas for improvement.
 */

import { normalizeTechName } from '@/lib/job-sites/tech-normalizer';

export interface UserSkillInfo {
  name: string;
  category: string;
  proficiency: number; // 1-5
}

export interface SkillGapItem {
  skill: string;
  category: string | null;
  status: 'strong' | 'moderate' | 'weak' | 'missing';
  userProficiency: number | null; // null if missing
  importance: 'required' | 'preferred';
  recommendation: string;
}

export interface SkillGapResult {
  matchScore: number; // 0-100
  strongSkills: SkillGapItem[];
  moderateSkills: SkillGapItem[];
  weakSkills: SkillGapItem[];
  missingSkills: SkillGapItem[];
  recommendedTopics: string[]; // For interview setup page
  summary: string;
}

/**
 * Analyze skill gap between user's skills and position requirements.
 */
export function analyzeSkillGap(
  userSkills: UserSkillInfo[],
  requiredTechStack: string[],
  requirements: string[],
  preferredQualifications: string[],
): SkillGapResult {
  // Build user skill lookup (normalized name -> skill info)
  const userSkillMap = new Map<string, UserSkillInfo>();
  for (const skill of userSkills) {
    const { normalized } = normalizeTechName(skill.name);
    userSkillMap.set(normalized.toLowerCase(), { ...skill, name: normalized });
  }

  // Extract tech mentions from requirements text
  const requiredTechs = new Set<string>();
  for (const tech of requiredTechStack) {
    const { normalized } = normalizeTechName(tech);
    requiredTechs.add(normalized);
  }

  // Also extract from requirement strings (look for tech keywords)
  for (const req of requirements) {
    extractTechFromText(req).forEach(t => requiredTechs.add(t));
  }

  const preferredTechs = new Set<string>();
  for (const qual of preferredQualifications) {
    extractTechFromText(qual).forEach(t => preferredTechs.add(t));
  }

  // Remove required techs from preferred (no duplicates)
  for (const tech of requiredTechs) {
    preferredTechs.delete(tech);
  }

  const items: SkillGapItem[] = [];

  // Analyze required techs
  for (const tech of requiredTechs) {
    const userSkill = userSkillMap.get(tech.toLowerCase());
    items.push(createGapItem(tech, userSkill, 'required'));
  }

  // Analyze preferred techs
  for (const tech of preferredTechs) {
    const userSkill = userSkillMap.get(tech.toLowerCase());
    items.push(createGapItem(tech, userSkill, 'preferred'));
  }

  // Categorize
  const strongSkills = items.filter(i => i.status === 'strong');
  const moderateSkills = items.filter(i => i.status === 'moderate');
  const weakSkills = items.filter(i => i.status === 'weak');
  const missingSkills = items.filter(i => i.status === 'missing');

  // Calculate match score
  const totalRequired = items.filter(i => i.importance === 'required').length;
  const matchedRequired = items.filter(
    i => i.importance === 'required' && (i.status === 'strong' || i.status === 'moderate')
  ).length;
  const matchScore = totalRequired > 0
    ? Math.round((matchedRequired / totalRequired) * 100)
    : 100;

  // Generate recommended interview topics
  const recommendedTopics = generateRecommendedTopics(items, userSkills);

  // Generate summary
  const summary = generateSummary(matchScore, strongSkills.length, missingSkills.length, totalRequired);

  return {
    matchScore,
    strongSkills,
    moderateSkills,
    weakSkills,
    missingSkills,
    recommendedTopics,
    summary,
  };
}

function createGapItem(
  tech: string,
  userSkill: UserSkillInfo | undefined,
  importance: 'required' | 'preferred',
): SkillGapItem {
  const { category } = normalizeTechName(tech);

  if (!userSkill) {
    return {
      skill: tech,
      category,
      status: 'missing',
      userProficiency: null,
      importance,
      recommendation: `${tech}에 대한 기본 개념을 학습하세요.`,
    };
  }

  if (userSkill.proficiency >= 4) {
    return {
      skill: tech,
      category,
      status: 'strong',
      userProficiency: userSkill.proficiency,
      importance,
      recommendation: `${tech}는 강점입니다. 심화 질문에 대비하세요.`,
    };
  }

  if (userSkill.proficiency >= 3) {
    return {
      skill: tech,
      category,
      status: 'moderate',
      userProficiency: userSkill.proficiency,
      importance,
      recommendation: `${tech} 활용 경험을 정리하고 트러블슈팅 사례를 준비하세요.`,
    };
  }

  return {
    skill: tech,
    category,
    status: 'weak',
    userProficiency: userSkill.proficiency,
    importance,
    recommendation: `${tech} 핵심 개념과 실무 적용 사례를 복습하세요.`,
  };
}

// Simple tech extraction from Korean/English text
function extractTechFromText(text: string): string[] {
  const TECH_KEYWORDS = [
    'Java', 'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Kotlin', 'Swift', 'C\\+\\+', 'C#',
    'React', 'Next\\.js', 'Vue', 'Angular', 'Spring', 'Django', 'FastAPI', 'NestJS', 'Express',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform',
    'Git', 'CI/CD', 'Jenkins', 'GitHub Actions',
    'PyTorch', 'TensorFlow', 'LangChain',
  ];

  const found: string[] = [];
  for (const keyword of TECH_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text)) {
      const { normalized } = normalizeTechName(keyword.replace(/\\\./g, '.').replace(/\\\+/g, '+'));
      found.push(normalized);
    }
  }
  return found;
}

function generateRecommendedTopics(items: SkillGapItem[], userSkills: UserSkillInfo[]): string[] {
  const topics = new Set<string>();

  // Add weak/missing required skills as topics
  for (const item of items) {
    if (item.importance === 'required' && (item.status === 'weak' || item.status === 'missing')) {
      topics.add(item.skill);
    }
  }

  // Add strong required skills (for advanced questions)
  for (const item of items) {
    if (item.importance === 'required' && item.status === 'strong') {
      topics.add(item.skill);
    }
  }

  // Add user's top skills that are also required
  for (const item of items) {
    if (item.status === 'moderate' && item.importance === 'required') {
      topics.add(item.skill);
    }
  }

  return Array.from(topics).slice(0, 10);
}

function generateSummary(
  matchScore: number,
  strongCount: number,
  missingCount: number,
  totalRequired: number,
): string {
  if (totalRequired === 0) return '포지션의 기술 요구사항을 분석할 수 없습니다.';

  if (matchScore >= 80) {
    return `기술 스택 매칭률 ${matchScore}%로 높은 적합도를 보입니다. ${strongCount}개 기술에서 강점이 있습니다.`;
  }
  if (matchScore >= 50) {
    return `기술 스택 매칭률 ${matchScore}%입니다. ${missingCount}개 기술을 추가로 학습하면 경쟁력이 높아집니다.`;
  }
  return `기술 스택 매칭률 ${matchScore}%입니다. ${missingCount}개 핵심 기술에 대한 학습이 필요합니다.`;
}
