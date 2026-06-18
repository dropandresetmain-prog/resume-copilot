import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftRationale,
} from "@/types/resume-draft";

/** Canonical final resume section order for preview and future export. */
export const FINAL_RESUME_SECTION_ORDER = [
  "header",
  "workExperience",
  "education",
  "additionalExperience",
  "skillsAndInterests",
] as const;

export type FinalResumeLayout = {
  header: {
    fullName: string;
    contactLine: string;
  };
  workExperience: Array<{
    company: string;
    role: string;
    location?: string;
    dateRange?: string;
    bullets: Array<{ keyword: string; statement: string; rawText: string }>;
  }>;
  education: Array<{
    institution: string;
    programmesLine: string;
    dateRange?: string;
    bullets: string[];
  }>;
  additionalExperienceLine: string;
  skillsLine: string;
  interestsLine: string;
};

export type PageFitEstimate = {
  estimatedLines: number;
  maxLinesOnePage: number;
  exceedsOnePage: boolean;
  marginMm: number;
  lineSpacing: number;
  sectionSpacing: number;
};

export type ResumeFitAssessment = {
  fitScore: number;
  optimizedFor: string[];
  scoreRationale: string;
  keyStrengths: string[];
  riskFlags: string[];
};

const DEFAULT_MAX_LINES_ONE_PAGE = 52;

export function parseKeywordBullet(text: string, fallbackKeyword = "Experience"): {
  keyword: string;
  statement: string;
} {
  const match = text.match(/^([^:]{1,40}):\s*(.+)$/);
  if (match) {
    return {
      keyword: match[1].trim(),
      statement: match[2].trim(),
    };
  }
  return {
    keyword: fallbackKeyword,
    statement: text.trim(),
  };
}

export function formatKeywordBullet(keyword: string, statement: string): string {
  const cleanKeyword = keyword.trim() || "Experience";
  const cleanStatement = statement.trim();
  if (!cleanStatement) {
    return `${cleanKeyword}:`;
  }
  if (/^[^:]+:\s/.test(cleanStatement)) {
    return cleanStatement;
  }
  return `${cleanKeyword}: ${cleanStatement}`;
}

function buildContactLine(header: ResumeDraftContent["header"]): string {
  const parts = [header.phone?.trim(), header.email?.trim()].filter(Boolean);
  return parts.join(" | ");
}

export function compactAdditionalExperience(
  items: ResumeDraftContent["additionalExperience"],
): string {
  const phrases = items
    .map((item) => item.text.trim())
    .filter(Boolean)
    .flatMap((text) => text.split(/[;\n]+/))
    .map((part) => part.trim())
    .filter(Boolean);

  return phrases.join(", ");
}

function extractSkillsAndInterests(content: ResumeDraftContent): {
  skillsLine: string;
  interestsLine: string;
} {
  const groups = content.skills.groups;
  const skillsGroup = groups.find((group) => /skill/i.test(group.label)) ?? groups[0];
  const interestsGroup = groups.find((group) => /interest/i.test(group.label));

  const skillsItems = skillsGroup?.items.filter(Boolean) ?? [];
  const interestsItems =
    interestsGroup?.items.filter(Boolean) ??
    groups
      .filter((group) => group !== skillsGroup)
      .flatMap((group) => group.items)
      .filter(Boolean);

  return {
    skillsLine: skillsItems.join(", "),
    interestsLine: interestsItems.join(", "),
  };
}

/** Build canonical one-page-oriented layout from generated draft content. */
export function buildFinalResumeLayout(content: ResumeDraftContent): FinalResumeLayout {
  const { skillsLine, interestsLine } = extractSkillsAndInterests(content);

  return {
    header: {
      fullName: content.header.fullName?.trim() ?? "",
      contactLine: buildContactLine(content.header),
    },
    workExperience: content.experience.map((experience) => ({
      company: experience.company,
      role: experience.role,
      location: experience.location,
      dateRange: experience.dateRange,
      bullets: experience.bullets
        .map((bullet: ResumeDraftExperienceBullet) => {
          const parsed = parseKeywordBullet(bullet.text);
          return {
            keyword: parsed.keyword,
            statement: parsed.statement,
            rawText: bullet.text,
          };
        })
        .filter((bullet) => bullet.statement.length > 0),
    })),
    education: content.education.map((item) => ({
      institution: item.institution,
      programmesLine: item.programmes.join(" · "),
      dateRange: item.dateRange,
      bullets: item.bullets,
    })),
    additionalExperienceLine: compactAdditionalExperience(content.additionalExperience),
    skillsLine,
    interestsLine,
  };
}

export function estimatePageFit(
  layout: FinalResumeLayout,
  options?: {
    maxLinesOnePage?: number;
    marginMm?: number;
    lineSpacing?: number;
    sectionSpacing?: number;
  },
): PageFitEstimate {
  const maxLinesOnePage = options?.maxLinesOnePage ?? DEFAULT_MAX_LINES_ONE_PAGE;
  const marginMm = options?.marginMm ?? 18;
  const lineSpacing = options?.lineSpacing ?? 1.15;
  const sectionSpacing = options?.sectionSpacing ?? 1.25;

  let lines = 0;

  if (layout.header.fullName) lines += 2;
  if (layout.header.contactLine) lines += 1;
  lines += sectionSpacing;

  for (const experience of layout.workExperience) {
    lines += 2 + sectionSpacing * 0.5;
    lines += experience.bullets.length * lineSpacing;
  }

  for (const education of layout.education) {
    lines += 2;
    lines += education.bullets.length;
    lines += sectionSpacing * 0.5;
  }

  if (layout.additionalExperienceLine) {
    lines += 2 * lineSpacing;
    lines += sectionSpacing * 0.5;
  }

  if (layout.skillsLine) {
    lines += 2 * lineSpacing;
  }
  if (layout.interestsLine) {
    lines += 2 * lineSpacing;
  }

  const estimatedLines = Math.ceil(lines);

  return {
    estimatedLines,
    maxLinesOnePage,
    exceedsOnePage: estimatedLines > maxLinesOnePage,
    marginMm,
    lineSpacing,
    sectionSpacing,
  };
}

export function calculateFitScore(
  content: ResumeDraftContent,
  rationale?: ResumeDraftRationale,
): ResumeFitAssessment {
  let score = 88;

  const globalRisks = content.globalRiskFlags ?? [];
  score -= Math.min(24, globalRisks.length * 6);

  const lowConfidenceBullets = content.experience
    .flatMap((experience) => experience.bullets)
    .filter((bullet) => bullet.confidence === "low").length;
  score -= Math.min(15, lowConfidenceBullets * 3);

  const omissions = rationale?.omissions ?? [];
  score -= Math.min(18, omissions.length * 4);

  const keywordUsage = rationale?.keywordUsage ?? [];
  score += Math.min(8, keywordUsage.length);

  if (content.experience.length >= 2) {
    score += 4;
  }

  const layout = buildFinalResumeLayout(content);
  const pageFit = estimatePageFit(layout);
  if (pageFit.exceedsOnePage) {
    score -= 12;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const optimizedFor = [
    ...(keywordUsage.slice(0, 3).map((keyword) => `Highlighted ${keyword} from approved keywords`)),
    "Aligned experience bullets to job description emphasis",
    "Used compact one-page section ordering",
    "Applied keyword-colon bullet formatting",
  ]
    .filter(Boolean)
    .slice(0, 5);

  const keyStrengths: string[] = [];
  if (content.experience.length > 0) {
    keyStrengths.push(`Strong ${content.experience[0]?.role ?? "role"} experience coverage`);
  }
  if (keywordUsage.length > 0) {
    keyStrengths.push("Relevant approved keywords incorporated");
  }
  if (!pageFit.exceedsOnePage) {
    keyStrengths.push("Draft fits one-page target estimate");
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push("Inventory-backed experience included");
  }

  const riskFlags = [
    ...globalRisks,
    ...omissions.map((item) => `Gap: ${item}`),
    ...(lowConfidenceBullets > 0
      ? [`${lowConfidenceBullets} low-confidence bullet(s) need review`]
      : []),
    ...(pageFit.exceedsOnePage ? ["Draft may exceed one page"] : []),
  ].slice(0, 6);

  return {
    fitScore: score,
    optimizedFor,
    scoreRationale:
      rationale?.overall ??
      "Score reflects JD alignment, approved keyword usage, confidence levels, omissions, and one-page fit estimate.",
    keyStrengths,
    riskFlags,
  };
}

export function layoutIncludesProfessionalSummary(content: ResumeDraftContent): boolean {
  return Boolean(content.professionalSummary?.text?.trim());
}
