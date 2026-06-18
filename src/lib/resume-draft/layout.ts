import type {
  ResumeDraftAdditionalExperienceItem,
  ResumeDraftContent,
  ResumeDraftEducationItem,
  ResumeDraftExperienceBullet,
  ResumeDraftExperienceSection,
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

export type WorkExperienceLayoutEntry = {
  company: string;
  companyDescriptor?: string;
  role: string;
  location?: string;
  dateRange?: string;
  bullets: Array<{ keyword: string; statement: string; rawText: string }>;
};

export type EducationDegreeBlock = {
  titleLine: string;
  degreeLine: string;
  location?: string;
  dateRange?: string;
};

export type EducationLayoutEntry = {
  degreeBlocks: EducationDegreeBlock[];
  achievementBullets: Array<{
    prefix?: string;
    underlinePrefix: boolean;
    text: string;
    rawText: string;
  }>;
};

export type FinalResumeLayout = {
  header: {
    fullName: string;
    contactLine: string;
  };
  workExperience: WorkExperienceLayoutEntry[];
  education: EducationLayoutEntry[];
  additionalExperienceLine: string;
  skillsLine: string;
  languagesLine: string;
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

const LANGUAGE_INTEREST_CATEGORY_PATTERN =
  /language|interest|hobby|technical skill|technical skills|^skills$/i;

export function parseKeywordBullet(
  text: string,
  fallbackKeyword = "Experience",
): {
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

export function parseAchievementBullet(text: string): {
  prefix?: string;
  underlinePrefix: boolean;
  text: string;
} {
  const match = text.match(/^([^:]{1,40}):\s*(.+)$/);
  if (match && /^achievement$/i.test(match[1].trim())) {
    return {
      prefix: "Achievement:",
      underlinePrefix: true,
      text: match[2].trim(),
    };
  }
  return {
    underlinePrefix: false,
    text: text.trim(),
  };
}

export function formatCompanyLine(company: string, companyDescriptor?: string): string {
  const cleanCompany = company.trim();
  const cleanDescriptor = companyDescriptor?.trim();
  if (!cleanDescriptor) {
    return cleanCompany;
  }
  return `${cleanCompany} (${cleanDescriptor})`;
}

export function shouldExcludeFromAdditionalExperience(item: {
  category?: string;
  text: string;
}): boolean {
  const category = item.category?.trim() ?? "";
  if (LANGUAGE_INTEREST_CATEGORY_PATTERN.test(category)) {
    return true;
  }

  const text = item.text.trim();
  if (/^conversational\s+[a-z]+$/i.test(text)) {
    return true;
  }

  return false;
}

export function filterAdditionalExperienceItems<
  T extends ResumeDraftAdditionalExperienceItem,
>(items: T[]): T[] {
  return items.filter((item) => !shouldExcludeFromAdditionalExperience(item));
}

function buildContactLine(header: ResumeDraftContent["header"]): string {
  const parts = [header.phone?.trim(), header.email?.trim()].filter(Boolean);
  return parts.join(" | ");
}

export function compactAdditionalExperience(
  items: ResumeDraftAdditionalExperienceItem[],
): string {
  const phrases = filterAdditionalExperienceItems(items)
    .map((item) => item.text.trim())
    .filter(Boolean)
    .flatMap((text) => text.split(/[;\n]+/))
    .map((part) => part.trim())
    .filter(Boolean);

  return phrases.join(", ");
}

function extractSkillsLanguagesAndInterests(content: ResumeDraftContent): {
  skillsLine: string;
  languagesLine: string;
  interestsLine: string;
} {
  const groups = content.skills.groups;
  const skillsGroup =
    groups.find((group) => /^skills$/i.test(group.label.trim())) ??
    groups.find((group) => /skill/i.test(group.label) && !/interest|language/i.test(group.label)) ??
    groups[0];
  const languagesGroup = groups.find((group) => /language/i.test(group.label));
  const interestsGroup = groups.find((group) => /interest/i.test(group.label));

  const skillsItems = skillsGroup?.items.filter(Boolean) ?? [];
  const languagesItems = languagesGroup?.items.filter(Boolean) ?? [];
  const interestsItems =
    interestsGroup?.items.filter(Boolean) ??
    groups
      .filter((group) => group !== skillsGroup && group !== languagesGroup)
      .flatMap((group) => group.items)
      .filter(Boolean);

  return {
    skillsLine: skillsItems.join(", "),
    languagesLine: languagesItems.join(", "),
    interestsLine: interestsItems.join(", "),
  };
}

export function buildWorkExperienceLayoutEntry(
  experience: ResumeDraftExperienceSection,
): WorkExperienceLayoutEntry {
  return {
    company: experience.company,
    companyDescriptor: experience.companyDescriptor,
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
  };
}

export function buildEducationLayoutEntry(
  item: ResumeDraftEducationItem,
): EducationLayoutEntry {
  const programmes = item.programmes.length > 0 ? item.programmes : [""];

  return {
    degreeBlocks: programmes.map((programme, index) => ({
      titleLine: programme
        ? `${item.institution} · ${programme}`
        : item.institution,
      degreeLine: programme || item.institution,
      location: item.location,
      dateRange: index === 0 ? item.dateRange : undefined,
    })),
    achievementBullets: item.bullets.map((bullet) => {
      const parsed = parseAchievementBullet(bullet);
      return {
        prefix: parsed.prefix,
        underlinePrefix: parsed.underlinePrefix,
        text: parsed.text,
        rawText: bullet,
      };
    }),
  };
}

/** Build canonical one-page-oriented layout from generated draft content. */
export function buildFinalResumeLayout(content: ResumeDraftContent): FinalResumeLayout {
  const { skillsLine, languagesLine, interestsLine } =
    extractSkillsLanguagesAndInterests(content);

  return {
    header: {
      fullName: content.header.fullName?.trim() ?? "",
      contactLine: buildContactLine(content.header),
    },
    workExperience: content.experience.map(buildWorkExperienceLayoutEntry),
    education: content.education.map(buildEducationLayoutEntry),
    additionalExperienceLine: compactAdditionalExperience(content.additionalExperience),
    skillsLine,
    languagesLine,
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
    lines += education.degreeBlocks.length * 2;
    lines += education.achievementBullets.length;
    lines += sectionSpacing * 0.5;
  }

  if (layout.additionalExperienceLine) {
    lines += 2 * lineSpacing;
    lines += sectionSpacing * 0.5;
  }

  if (layout.skillsLine) {
    lines += 1.5 * lineSpacing;
  }
  if (layout.languagesLine) {
    lines += 1.5 * lineSpacing;
  }
  if (layout.interestsLine) {
    lines += 1.5 * lineSpacing;
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
    "Prioritized 2–4 strong bullets per role for one-page fit",
    "Used compact Additional Experience and Skills & Interests lines",
    "Applied keyword-colon bullet formatting with visible bullet markers",
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
    ...(pageFit.exceedsOnePage
      ? ["Draft may exceed one page — consider reducing bullets in Edit Resume Details"]
      : []),
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
