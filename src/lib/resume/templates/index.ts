import type { ResumeData } from '../types';
import type { TemplateType } from '../types';
import { renderCleanModern } from './clean-modern';
import { renderProfessional } from './professional';
import { renderExecutive } from './executive';

type TemplateFn = (data: ResumeData) => string;

const TEMPLATE_REGISTRY: Record<TemplateType, TemplateFn> = {
  'clean-modern': renderCleanModern,
  'professional': renderProfessional,
  'executive': renderExecutive,
};

export function renderToHtml(data: ResumeData, template: TemplateType): string {
  const templateFn = TEMPLATE_REGISTRY[template];
  return templateFn(data);
}

export { renderCleanModern, renderProfessional, renderExecutive };
