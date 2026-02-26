import type { ResumeData, ResumeExperience, ResumeSkill } from '../types';
import { CLEAN_MODERN_STYLES, BASE_RESET } from './styles';
import { MAX_BULLETS_PER_ROLE } from '../constants';

const s = CLEAN_MODERN_STYLES;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateRange(startDate: string, endDate?: string): string {
  return endDate ? `${startDate} – ${endDate}` : `${startDate} – 재직중`;
}

function renderHeader(data: ResumeData): string {
  const photo = data.photoUrl ? `
    <img src="${data.photoUrl}" style="width: 90px; height: 110px; object-fit: cover; border-radius: 4px; float: right; margin-left: 16px;" />
  ` : '';
  return `
    <header style="margin-bottom: ${s.sectionGap}; overflow: hidden;">
      ${photo}
      <h1 style="font-size: ${s.nameSize}; font-weight: ${s.headingWeight}; color: ${s.primaryColor}; letter-spacing: -0.5px; margin-bottom: 6px;">
        ${escapeHtml(data.name)}
      </h1>
      <p style="font-size: ${s.roleSize}; color: ${s.secondaryColor}; margin-bottom: 4px;">
        ${escapeHtml(data.currentRole)}
        <span style="color: ${s.mutedColor}; margin-left: 8px;">경력 ${data.totalYearsExp}년</span>
      </p>
      ${data.email ? `<p style="font-size: ${s.bodySize}; color: ${s.mutedColor};">${escapeHtml(data.email)}</p>` : ''}
      ${data.targetCompany ? `<p style="font-size: ${s.bodySize}; color: ${s.mutedColor}; margin-top: 4px;">지원: ${escapeHtml(data.targetCompany)}${data.targetPosition ? ` · ${escapeHtml(data.targetPosition)}` : ''}</p>` : ''}
    </header>
  `;
}

function renderCoreCompetencies(competencies: string[]): string {
  if (!competencies.length) return '';
  return `
    <section style="margin-bottom: ${s.sectionGap};">
      <h2 style="font-size: ${s.sectionHeadingSize}; font-weight: ${s.headingWeight}; color: ${s.mutedColor}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
        핵심역량
      </h2>
      <ul style="list-style: none; padding: 0;">
        ${competencies.map(c => `
          <li style="font-size: ${s.bodySize}; color: ${s.textColor}; padding: 3px 0; display: flex; gap: 8px; font-weight: 500;">
            <span style="color: ${s.secondaryColor}; flex-shrink: 0;">${s.bulletStyle}</span>
            <span>${escapeHtml(c)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderSummary(summary: string): string {
  const paragraphs = escapeHtml(summary)
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => `<p style="font-size: ${s.bodySize}; color: ${s.textColor}; line-height: ${s.lineHeight}; margin-bottom: 12px;">${p.trim()}</p>`)
    .join('');
  return `
    <section style="margin-bottom: ${s.sectionGap};">
      <h2 style="font-size: ${s.sectionHeadingSize}; font-weight: ${s.headingWeight}; color: ${s.mutedColor}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
        자기소개
      </h2>
      ${paragraphs}
    </section>
  `;
}

function renderStrengths(strengths: string[]): string {
  if (!strengths.length) return '';
  return `
    <section style="margin-bottom: ${s.sectionGap};">
      <h2 style="font-size: ${s.sectionHeadingSize}; font-weight: ${s.headingWeight}; color: ${s.mutedColor}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
        강점
      </h2>
      <ul style="list-style: none; padding: 0;">
        ${strengths.map(str => `
          <li style="font-size: ${s.bodySize}; color: ${s.textColor}; padding: 3px 0; display: flex; gap: 8px;">
            <span style="color: ${s.mutedColor};">${s.bulletStyle}</span>
            <span>${escapeHtml(str)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderExperience(exp: ResumeExperience, index: number): string {
  const bullets = exp.achievements.slice(0, MAX_BULLETS_PER_ROLE);
  return `
    <div class="resume-exp-item" style="${index > 0 ? `margin-top: ${s.itemGap};` : ''}">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <div>
          <span style="font-size: 14px; font-weight: ${s.headingWeight}; color: ${s.primaryColor};">${escapeHtml(exp.company)}</span>
          <span style="font-size: ${s.bodySize}; color: ${s.secondaryColor}; margin-left: 10px;">${escapeHtml(exp.role)}</span>
        </div>
        <span style="font-size: ${s.bodySize}; color: ${s.mutedColor}; white-space: nowrap; margin-left: 16px;">
          ${escapeHtml(formatDateRange(exp.startDate, exp.endDate))}
        </span>
      </div>
      ${exp.techStack.length ? `
        <p style="font-size: 12px; color: ${s.mutedColor}; margin-bottom: 6px;">
          ${exp.techStack.map(t => escapeHtml(t)).join(' · ')}
        </p>
      ` : ''}
      ${exp.description ? `
        <p style="font-size: ${bullets.length ? '12px' : s.bodySize}; color: ${bullets.length ? s.mutedColor : s.textColor}; margin-bottom: 6px; line-height: ${s.lineHeight};${bullets.length ? ' font-style: italic;' : ''}">
          ${escapeHtml(exp.description)}
        </p>
      ` : ''}
      ${bullets.length ? `
        <ul style="list-style: none; padding: 0;">
          ${bullets.map(b => `
            <li style="font-size: ${s.bodySize}; color: ${s.textColor}; padding: 2px 0; display: flex; gap: 8px; line-height: ${s.lineHeight};">
              <span style="color: ${s.mutedColor}; flex-shrink: 0;">${s.bulletStyle}</span>
              <span>${escapeHtml(b)}</span>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

function renderExperiences(experiences: ResumeExperience[]): string {
  if (!experiences.length) return '';
  return `
    <section style="margin-bottom: ${s.sectionGap};">
      <h2 style="font-size: ${s.sectionHeadingSize}; font-weight: ${s.headingWeight}; color: ${s.mutedColor}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px;">
        경력사항
      </h2>
      ${experiences.map((exp, i) => renderExperience(exp, i)).join('')}
    </section>
  `;
}

function renderSkills(skills: ResumeSkill[]): string {
  if (!skills.length) return '';

  const byCategory = skills.reduce<Record<string, ResumeSkill[]>>((acc, skill) => {
    const cat = skill.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return `
    <section style="margin-bottom: ${s.sectionGap};">
      <h2 style="font-size: ${s.sectionHeadingSize}; font-weight: ${s.headingWeight}; color: ${s.mutedColor}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
        기술스택
      </h2>
      ${Object.entries(byCategory).map(([category, catSkills]) => `
        <div style="margin-bottom: 8px; display: flex; gap: 12px; align-items: baseline;">
          <span style="font-size: 12px; color: ${s.mutedColor}; min-width: 80px; flex-shrink: 0;">${escapeHtml(category)}</span>
          <span style="font-size: ${s.bodySize}; color: ${s.textColor};">
            ${catSkills.map(sk => escapeHtml(sk.name)).join(', ')}
          </span>
        </div>
      `).join('')}
    </section>
  `;
}

export function renderCleanModern(data: ResumeData): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.name)} - 이력서</title>
  <style>
    ${BASE_RESET}
    html, body {
      font-family: ${s.fontFamily};
      font-size: ${s.baseFontSize};
      line-height: ${s.lineHeight};
      color: ${s.textColor};
      background: #ffffff;
    }
    .page {
      width: 210mm;
      margin: 0 auto;
      padding: 0 48px;
      background: #ffffff;
    }
    @media screen {
      .page { min-height: 297mm; }
    }
    @media print {
      .page { width: 100%; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${renderHeader(data)}
    ${data.coreCompetencies.length ? renderCoreCompetencies(data.coreCompetencies) : ''}
    ${data.summary ? renderSummary(data.summary) : ''}
    ${renderExperiences(data.experiences)}
    ${renderSkills(data.skills)}
    ${data.strengths?.length ? renderStrengths(data.strengths) : ''}
  </div>
</body>
</html>`;
}
