import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import type { ResumeData, ResumeExperience, ResumeSkill, TemplateType } from '../types';
import { MAX_BULLETS_PER_ROLE } from '../constants';
import { fetchPhotoBuffer } from '../photo-utils';

// ── Template style definitions ──────────────────────────────────────────────

interface DocxTemplateStyles {
  fontName: string;
  nameSizePt: number;      // half-points (docx uses half-points: pt * 2)
  roleSizePt: number;
  headingSizePt: number;
  bodySizePt: number;
  smallSizePt: number;
  primaryColor: string;    // hex without #
  secondaryColor: string;
  mutedColor: string;
  headingBold: boolean;
  sectionSpacingPt: number;
  itemSpacingPt: number;
}

const STYLES: Record<TemplateType, DocxTemplateStyles> = {
  'clean-modern': {
    fontName: 'Noto Sans CJK KR',
    nameSizePt: 28,
    roleSizePt: 16,
    headingSizePt: 13,
    bodySizePt: 13,
    smallSizePt: 11,
    primaryColor: '1a1a1a',
    secondaryColor: '444444',
    mutedColor: '888888',
    headingBold: true,
    sectionSpacingPt: 16,
    itemSpacingPt: 10,
  },
  'professional': {
    fontName: 'Noto Sans CJK KR',
    nameSizePt: 26,
    roleSizePt: 15,
    headingSizePt: 12,
    bodySizePt: 12,
    smallSizePt: 11,
    primaryColor: '0d2137',
    secondaryColor: '1e4976',
    mutedColor: '666666',
    headingBold: true,
    sectionSpacingPt: 14,
    itemSpacingPt: 9,
  },
  'executive': {
    fontName: 'Noto Sans CJK KR',
    nameSizePt: 30,
    roleSizePt: 16,
    headingSizePt: 11,
    bodySizePt: 13,
    smallSizePt: 11,
    primaryColor: '0a0a0a',
    secondaryColor: '2c2c2c',
    mutedColor: '777777',
    headingBold: true,
    sectionSpacingPt: 16,
    itemSpacingPt: 11,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pt(size: number): number {
  // docx size is in half-points
  return size * 2;
}

function spacingAfter(pts: number): IParagraphOptions['spacing'] {
  return { after: pts * 20 }; // docx uses twentieths of a point
}

function run(text: string, opts: IRunOptions = {}): TextRun {
  return new TextRun({ text, ...opts });
}

function formatDateRange(startDate: string, endDate?: string): string {
  return endDate ? `${startDate} – ${endDate}` : `${startDate} – 재직중`;
}

/** base64 data URI를 Buffer + 고정 크기로 변환 */
async function base64ToPhotoData(dataUri: string): Promise<{ buffer: Buffer; width: number; height: number } | undefined> {
  try {
    const match = dataUri.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!match) return undefined;
    return {
      buffer: Buffer.from(match[1], 'base64'),
      width: 90,
      height: 110,
    };
  } catch {
    return undefined;
  }
}

// ── Section builders ─────────────────────────────────────────────────────────

function buildSectionHeading(label: string, s: DocxTemplateStyles): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      run(label, {
        bold: s.headingBold,
        size: pt(s.headingSizePt),
        font: s.fontName,
        color: s.primaryColor,
        allCaps: true,
      }),
    ],
    border: {
      bottom: {
        color: s.primaryColor,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { after: 120 },
  });
}

function buildCoreCompetencies(data: ResumeData, s: DocxTemplateStyles): Paragraph[] {
  if (!data.coreCompetencies.length) return [];

  const paragraphs: Paragraph[] = [buildSectionHeading('핵심역량', s)];

  for (const c of data.coreCompetencies) {
    paragraphs.push(
      new Paragraph({
        children: [
          run(`• ${c}`, {
            bold: true,
            size: pt(s.bodySizePt),
            font: s.fontName,
            color: s.primaryColor,
          }),
        ],
        indent: { left: 240 },
        spacing: { after: 40 },
      })
    );
  }

  paragraphs.push(new Paragraph({ children: [], spacing: spacingAfter(s.sectionSpacingPt) }));

  return paragraphs;
}

function buildSummary(data: ResumeData, s: DocxTemplateStyles): Paragraph[] {
  if (!data.summary) return [];

  const paragraphs = data.summary
    .split(/\n\n+/)
    .filter(p => p.trim());

  return [
    buildSectionHeading('자기소개', s),
    ...paragraphs.map((p, i) => new Paragraph({
      children: [
        run(p.trim(), {
          size: pt(s.bodySizePt),
          font: s.fontName,
          color: s.primaryColor,
        }),
      ],
      spacing: i < paragraphs.length - 1 ? { after: 120 } : spacingAfter(s.sectionSpacingPt),
    })),
  ];
}

function buildExperience(exp: ResumeExperience, s: DocxTemplateStyles, isFirst: boolean): Paragraph[] {
  const bullets = exp.achievements.slice(0, MAX_BULLETS_PER_ROLE);
  const paragraphs: Paragraph[] = [];

  // Company + role + date line
  paragraphs.push(
    new Paragraph({
      children: [
        run(exp.company, {
          bold: true,
          size: pt(s.bodySizePt + 1),
          font: s.fontName,
          color: s.primaryColor,
        }),
        run(`  ${exp.role}`, {
          size: pt(s.bodySizePt),
          font: s.fontName,
          color: s.secondaryColor,
        }),
        run(`  ${formatDateRange(exp.startDate, exp.endDate)}`, {
          size: pt(s.smallSizePt),
          font: s.fontName,
          color: s.mutedColor,
        }),
      ],
      spacing: { before: isFirst ? 0 : s.itemSpacingPt * 20, after: 60 },
    })
  );

  // Tech stack
  if (exp.techStack.length) {
    paragraphs.push(
      new Paragraph({
        children: [
          run(exp.techStack.join(' · '), {
            size: pt(s.smallSizePt),
            font: s.fontName,
            color: s.mutedColor,
          }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  // Description — role summary style when achievements exist, full style otherwise
  if (exp.description) {
    const hasAchievements = bullets.length > 0;
    paragraphs.push(
      new Paragraph({
        children: [
          run(exp.description, {
            size: pt(hasAchievements ? s.smallSizePt : s.bodySizePt),
            font: s.fontName,
            color: hasAchievements ? s.mutedColor : s.primaryColor,
            italics: hasAchievements,
          }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  // Achievements bullets
  for (const bullet of bullets) {
    paragraphs.push(
      new Paragraph({
        children: [
          run(`• ${bullet}`, {
            size: pt(s.bodySizePt),
            font: s.fontName,
            color: s.primaryColor,
          }),
        ],
        indent: { left: 240 },
        spacing: { after: 40 },
      })
    );
  }

  return paragraphs;
}

function buildExperiences(data: ResumeData, s: DocxTemplateStyles): Paragraph[] {
  if (!data.experiences.length) return [];

  const paragraphs: Paragraph[] = [buildSectionHeading('경력사항', s)];

  data.experiences.forEach((exp, i) => {
    paragraphs.push(...buildExperience(exp, s, i === 0));
  });

  // Add section gap after last experience
  paragraphs.push(new Paragraph({ children: [], spacing: spacingAfter(s.sectionSpacingPt) }));

  return paragraphs;
}

function buildSkills(data: ResumeData, s: DocxTemplateStyles): Paragraph[] {
  if (!data.skills.length) return [];

  const byCategory = data.skills.reduce<Record<string, ResumeSkill[]>>((acc, skill) => {
    const cat = skill.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const paragraphs: Paragraph[] = [buildSectionHeading('기술스택', s)];

  for (const [category, catSkills] of Object.entries(byCategory)) {
    paragraphs.push(
      new Paragraph({
        children: [
          run(`${category}  `, {
            bold: true,
            size: pt(s.smallSizePt),
            font: s.fontName,
            color: s.secondaryColor,
          }),
          run(catSkills.map(sk => sk.name).join(', '), {
            size: pt(s.bodySizePt),
            font: s.fontName,
            color: s.primaryColor,
          }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  paragraphs.push(new Paragraph({ children: [], spacing: spacingAfter(s.sectionSpacingPt) }));

  return paragraphs;
}

function buildStrengths(data: ResumeData, s: DocxTemplateStyles): Paragraph[] {
  if (!data.strengths?.length) return [];

  const paragraphs: Paragraph[] = [buildSectionHeading('강점', s)];

  for (const strength of data.strengths) {
    paragraphs.push(
      new Paragraph({
        children: [
          run(`• ${strength}`, {
            size: pt(s.bodySizePt),
            font: s.fontName,
            color: s.primaryColor,
          }),
        ],
        indent: { left: 240 },
        spacing: { after: 40 },
      })
    );
  }

  return paragraphs;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateDocx(data: ResumeData, template: TemplateType): Promise<Buffer> {
  const s = STYLES[template];

  // Fetch photo buffer for DOCX embedding (silently skips on failure)
  let photoParagraph: Paragraph | null = null;
  if (data.photoUrl) {
    const photoData = data.photoUrl.startsWith('data:')
      ? await base64ToPhotoData(data.photoUrl)
      : await fetchPhotoBuffer(data.photoUrl);
    if (photoData) {
      photoParagraph = new Paragraph({
        children: [
          new ImageRun({
            data: photoData.buffer,
            transformation: { width: photoData.width, height: photoData.height },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 80 },
      });
    }
  }

  // Build header separately to handle spacing properly
  const headerParagraphs: Paragraph[] = [
    ...(photoParagraph ? [photoParagraph] : []),
    new Paragraph({
      children: [
        run(data.name, {
          bold: true,
          size: pt(s.nameSizePt),
          font: s.fontName,
          color: s.primaryColor,
        }),
      ],
      spacing: spacingAfter(6),
    }),
    new Paragraph({
      children: [
        run(data.currentRole, {
          size: pt(s.roleSizePt),
          font: s.fontName,
          color: s.secondaryColor,
        }),
        run(`  ·  경력 ${data.totalYearsExp}년`, {
          size: pt(s.roleSizePt),
          font: s.fontName,
          color: s.mutedColor,
        }),
      ],
      spacing: spacingAfter(4),
    }),
    ...(data.email
      ? [new Paragraph({
          children: [run(data.email, { size: pt(s.smallSizePt), font: s.fontName, color: s.mutedColor })],
          spacing: spacingAfter(2),
        })]
      : []),
    ...(data.targetCompany
      ? [new Paragraph({
          children: [
            run(
              data.targetPosition
                ? `지원: ${data.targetCompany} · ${data.targetPosition}`
                : `지원: ${data.targetCompany}`,
              { size: pt(s.smallSizePt), font: s.fontName, color: s.mutedColor }
            ),
          ],
          spacing: spacingAfter(s.sectionSpacingPt),
        })]
      : [new Paragraph({ children: [], spacing: spacingAfter(s.sectionSpacingPt) })]),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,  // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 1080,    // ~19mm
              bottom: 1080,
              left: 1260,   // ~22mm
              right: 1260,
            },
          },
        },
        children: [
          ...headerParagraphs,
          ...buildCoreCompetencies(data, s),
          ...buildSummary(data, s),
          ...buildExperiences(data, s),
          ...buildSkills(data, s),
          ...buildStrengths(data, s),
        ],
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: s.fontName,
            size: pt(s.bodySizePt),
            color: s.primaryColor,
          },
        },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
