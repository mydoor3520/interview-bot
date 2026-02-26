import type { JobFunctionConfig } from './types';
import { developerConfig } from './developer';
import { marketerConfig } from './marketer';
import { designerConfig } from './designer';
import { pmConfig } from './pm';
import { generalConfig } from './general';

const JOB_FUNCTIONS: Record<string, JobFunctionConfig> = {
  developer: developerConfig,
  marketer: marketerConfig,
  designer: designerConfig,
  pm: pmConfig,
  general: generalConfig,
};

export function getJobFunction(id: string): JobFunctionConfig {
  return JOB_FUNCTIONS[id] || JOB_FUNCTIONS.developer;
}

export function listJobFunctions(): JobFunctionConfig[] {
  return Object.values(JOB_FUNCTIONS);
}

export function getDefaultJobFunction(): string {
  return 'developer';
}

export type { JobFunctionConfig, TopicGroup, SkillCategory } from './types';
