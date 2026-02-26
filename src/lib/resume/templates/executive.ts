import type { ResumeData, ResumeExperience, ResumeSkill } from '../types';
import { EXECUTIVE_STYLES, BASE_RESET } from './styles';
import { MAX_BULLETS_PER_ROLE } from '../constants';

const s = EXECUTIVE_STYLES;

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

function sectionHeading(label: string): string {
  return `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
      <h2 style="font-size: ${s.sectionHeadingSize}; font-weight: ${s.headingWeight}; color: ${s.primaryColor}; text-transform: uppercase; letter-spacing: 2px; white-space: nowrap;">
        ${label}
      </h2>
      <div style="flex: 1; height: 1px; background: ${s.borderColor};"></div>
    </div>
  `;
}

function renderHeader(data: ResumeData): string {
  const photo = data.photoUrl ? `
    <img src="${data.photoUrl}" style="width: 90px; height: 110px; object-fit: cover; border-radius: 2px; border: 1px solid ${s.borderColor}; float: right; margin-left: 16px;" />
  ` : '';
  return `
    <header style="margin-bottom: ${s.sectionGap}; border-bottom: 3px solid ${s.primaryColor}; padding-bottom: 20px; overflow: hidden;">
      ${photo}
      <h1 style="font-size: ${s.nameSize}; font-weight: ${s.headingWeight}; color: ${s.primaryColor}; letter-spacing: -1px; margin-bottom: 6px;">
        ${escapeHtml(data.name)}
      </h1>
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <p style="font-size: ${s.roleSize}; color: ${s.secondaryColor}; font-weight: 600;">
          ${escapeHtml(data.currentRole)} &nbsp;·&nbsp; 경력 ${data.totalYearsExp}년
        </p>
        ${data.email ? `<p style="font-size: ${s.bodySize}; color: ${s.mutedColor};">${escapeHtml(data.email)}</p>` : ''}
      </div>
      ${data.targetCompany ? `
        <p style="font-size: ${s.bodySize}; color: ${s.mutedColor}; margin-top: 6px;">
          지원: ${escapeHtml(data.targetCompany)}${data.targetPosition ? ` · ${escapeHtml(data.targetPosition)}` : ''}
        </p>
      ` : ''}
    </header>
  `;
}

function renderCoreCompetencies(competencies: string[]): string {
  if (!competencies.length) return '';
  return `
    <section style="margin-bottom: ${s.sectionGap};">
      ${sectionHeading('핵심역량')}
      <ul style="list-style: none; padding: 0;">
        ${competencies.map(c => `
          <li style="font-size: ${s.bodySize}; color: ${s.textColor}; padding: 3px 0; display: flex; gap: 10px; line-height: ${s.lineHeight};">
            <span style="color: ${s.primaryColor}; flex-shrink: 0; font-weight: 700;">${s.bulletStyle}</span>
            <span style="font-weight: 600;">${escapeHtml(c)}</span>
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
      ${sectionHeading('프로필')}
      ${paragraphs}
    </section>
  `;
}

function renderExperience(exp: ResumeExperience, index: number): string {
  const bullets = exp.achievements.slice(0, MAX_BULLETS_PER_ROLE);
  return `
    <div class="resume-exp-item" style="${index > 0 ? `margin-top: ${s.itemGap};` : ''}">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <div>
          <span style="font-size: 15px; font-weight: ${s.headingWeight}; color: ${s.primaryColor};">${escapeHtml(exp.company)}</span>
          <span style="font-size: ${s.bodySize}; color: ${s.secondaryColor}; margin-left: 10px; font-weight: 600;">${escapeHtml(exp.role)}</span>
        </div>
        <span style="font-size: ${s.bodySize}; color: ${s.mutedColor}; white-space: nowrap; margin-left: 16px; font-weight: 500;">
          ${escapeHtml(formatDateRange(exp.startDate, exp.endDate))}
        </span>
      </div>
      ${exp.techStack.length ? `
        <p style="font-size: 12px; color: ${s.mutedColor}; margin-bottom: 6px; letter-spacing: 0.3px;">
          ${exp.techStack.map(t => escapeHtml(t)).join(' · ')}
        </p>
      ` : ''}
      ${exp.description ? `
        <p style="font-size: ${bullets.length ? '12px' : s.bodySize}; color: ${bullets.length ? s.mutedColor : s.textColor}; margin-bottom: ${bullets.length ? '6px' : '8px'}; line-height: ${s.lineHeight};${bullets.length ? ' font-style: italic;' : ''}">
          ${escapeHtml(exp.description)}
        </p>
      ` : ''}
      ${bullets.length ? `
        <ul style="list-style: none; padding: 0;">
          ${bullets.map(b => `
            <li style="font-size: ${s.bodySize}; color: ${s.textColor}; padding: 3px 0; display: flex; gap: 10px; line-height: ${s.lineHeight};">
              <span style="color: ${s.primaryColor}; flex-shrink: 0; font-weight: 700;">${s.bulletStyle}</span>
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
      ${sectionHeading('경력사항')}
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
      ${sectionHeading('기술스택')}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;">
        ${Object.entries(byCategory).map(([category, catSkills]) => `
          <div style="display: flex; gap: 10px; align-items: baseline;">
            <span style="font-size: 12px; color: ${s.primaryColor}; font-weight: 700; min-width: 70px; flex-shrink: 0;">${escapeHtml(category)}</span>
            <span style="font-size: ${s.bodySize}; color: ${s.textColor};">
              ${catSkills.map(sk => escapeHtml(sk.name)).join(', ')}
            </span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderStrengths(strengths: string[]): string {
  if (!strengths.length) return '';
  return `
    <section style="margin-bottom: ${s.sectionGap};">
      ${sectionHeading('강점')}
      <ul style="list-style: none; padding: 0;">
        ${strengths.map(str => `
          <li style="font-size: ${s.bodySize}; color: ${s.textColor}; padding: 3px 0; display: flex; gap: 10px; line-height: ${s.lineHeight};">
            <span style="color: ${s.primaryColor}; font-weight: 700;">${s.bulletStyle}</span>
            <span>${escapeHtml(str)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

export function renderExecutive(data: ResumeData): string {
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
      padding: 0 52px;
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
