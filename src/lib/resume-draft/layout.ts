import type {
  ResumeDraftAdditionalExperienceItem,
  ResumeDraftContent,
  ResumeDraftEducationItem,
  ResumeDraftExperienceBullet,
  ResumeDraftExperienceSection,
  ResumeDraftRationale,
} from "@/types/resume-draft";
import { extractSkillsLanguagesInterests } from "@/lib/resume-draft/skills-section";
import { repairKeywordBullet } from "@/lib/resume-draft/keyword-repair";
import {
  normalizeAdditionalExperienceItems,
  parseAdditionalExperienceItemText,
} from "@/lib/resume-draft/additional-experience";
import {
  computeMaxLinesOnePage,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_ITEM_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_MARGIN_DEFAULT_MM,
  PREVIEW_MARGIN_TOP_DEFAULT_MM,
  PREVIEW_SECTION_SPACING_DEFAULT,
} from "@/lib/resume-draft/preview-settings";
import { getDateRangeEndSortKey } from "@/lib/date/duration";
import { normalizeEducationForLayout } from "@/lib/resume-draft/education-layout";

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

export type EducationDegreeLine = {
  text: string;
  dateRange?: string;
};

/** @deprecated Use institutionLine + degreeLines — kept for type migration reference. */
export type EducationDegreeBlock = {
  titleLine: string;
  degreeLine: string;
  location?: string;
  dateRange?: string;
};

export type EducationLayoutEntry = {
  institutionLine: string;
  location?: string;
  degreeLines: EducationDegreeLine[];
  achievementBullets: Array<{
    prefix?: string;
    underlinePrefix: boolean;
    text: string;
    rawText: string;
  }>;
};

export type AdditionalExperienceLayoutEntry = {
  title: string;
  detail: string;
};

export type FinalResumeLayout = {
  header: {
    fullName: string;
    contactLine: string;
  };
  workExperience: WorkExperienceLayoutEntry[];
  education: EducationLayoutEntry[];
  additionalExperienceEntries: AdditionalExperienceLayoutEntry[];
  /** Joined display string for legacy checks and DOCX approximate export. */
  additionalExperienceLine: string;
  skillsLine: string;
  languagesLine: string;
  interestsLine: string;
};

export type PageFitEstimate = {
  estimatedLines: number;
  maxLinesOnePage: number;
  exceedsOnePage: boolean;
  overflowLines: number;
  estimatedPages: number;
  marginMm: number;
  marginTopMm: number;
  lineSpacing: number;
  itemLineSpacing: number;
  sectionSpacing: number;
  bodyFontPx: number;
};

/** Target rubric version — see docs/FIT_SCORE_RUBRIC.md (not fully implemented yet). */
export const FIT_SCORE_RUBRIC_VERSION = "fit-rubric-v1";

/** Provisional preview heuristic — penalty/bonus on draft content; not the full rubric. */
export const PREVIEW_FIT_HEURISTIC_VERSION = "preview-fit-heuristic-v1";

export type ResumeFitAssessment = {
  fitScore: number;
  heuristicVersion: typeof PREVIEW_FIT_HEURISTIC_VERSION;
  optimizedFor: string[];
  scoreRationale: string;
  keyStrengths: string[];
  riskFlags: string[];
};

export function sortReverseChronological<T>(
  items: readonly T[],
  getDateRange: (item: T) => string | undefined,
  referenceDate: Date = new Date(),
): T[] {
  const indexed = items.map((item, index) => ({
    item,
    index,
    ...getDateRangeEndSortKey(getDateRange(item), referenceDate),
  }));

  return [...indexed]
    .sort((a, b) => {
      if (a.hasDate && b.hasDate) {
        return b.sortKey - a.sortKey;
      }
      if (a.hasDate && !b.hasDate) {
        return -1;
      }
      if (!a.hasDate && b.hasDate) {
        return 1;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

export {
  extractDateRangeFromPhrase,
  filterAdditionalExperienceItems,
  parseAdditionalExperienceItemText,
  shouldExcludeFromAdditionalExperience,
  sortAdditionalExperiencePhrases,
} from "@/lib/resume-draft/additional-experience";

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

function buildContactLine(header: ResumeDraftContent["header"]): string {
  const parts = [header.phone?.trim(), header.email?.trim()].filter(Boolean);
  return parts.join(" | ");
}

export function buildAdditionalExperienceEntries(
  items: ResumeDraftAdditionalExperienceItem[],
): AdditionalExperienceLayoutEntry[] {
  const normalized = normalizeAdditionalExperienceItems(items);

  return normalized
    .map((item) => parseAdditionalExperienceItemText(item.text))
    .filter((entry): entry is AdditionalExperienceLayoutEntry => entry !== null);
}

export function formatAdditionalExperienceLine(
  entries: AdditionalExperienceLayoutEntry[],
): string {
  return entries.map((entry) => `${entry.title}: ${entry.detail}`).join("; ");
}

export function compactAdditionalExperience(
  items: ResumeDraftAdditionalExperienceItem[],
): string {
  return formatAdditionalExperienceLine(buildAdditionalExperienceEntries(items));
}

function extractSkillsLanguagesAndInterests(content: ResumeDraftContent): {
  skillsLine: string;
  languagesLine: string;
  interestsLine: string;
} {
  return extractSkillsLanguagesInterests(content);
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
        const parsed = repairKeywordBullet(bullet.text);
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
  const normalized = normalizeEducationForLayout(item);

  return {
    institutionLine: normalized.institutionLine,
    location: normalized.location,
    degreeLines: normalized.degreeLines,
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

  const sortedExperience = sortReverseChronological(
    content.experience,
    (experience) => experience.dateRange,
  );
  const sortedEducation = sortReverseChronological(
    content.education,
    (item) => item.dateRange,
  );
  const additionalExperienceEntries = buildAdditionalExperienceEntries(
    content.additionalExperience,
  );

  return {
    header: {
      fullName: content.header.fullName?.trim() ?? "",
      contactLine: buildContactLine(content.header),
    },
    workExperience: sortedExperience.map(buildWorkExperienceLayoutEntry),
    education: sortedEducation.map(buildEducationLayoutEntry),
    additionalExperienceEntries,
    additionalExperienceLine: formatAdditionalExperienceLine(additionalExperienceEntries),
    skillsLine,
    languagesLine,
    interestsLine,
  };
}

export function estimatePageFit(
  layout: FinalResumeLayout,
  options?: {
    marginMm?: number;
    marginTopMm?: number;
    lineSpacing?: number;
    itemLineSpacing?: number;
    sectionSpacing?: number;
    bodyFontPx?: number;
  },
): PageFitEstimate {
  const marginMm = options?.marginMm ?? PREVIEW_MARGIN_DEFAULT_MM;
  const marginTopMm = options?.marginTopMm ?? PREVIEW_MARGIN_TOP_DEFAULT_MM;
  const lineSpacing = options?.lineSpacing ?? PREVIEW_LINE_SPACING_DEFAULT;
  const itemLineSpacing = options?.itemLineSpacing ?? PREVIEW_ITEM_LINE_SPACING_DEFAULT;
  const sectionSpacing = options?.sectionSpacing ?? PREVIEW_SECTION_SPACING_DEFAULT;
  const bodyFontPx = options?.bodyFontPx ?? PREVIEW_BODY_FONT_DEFAULT_PX;

  const maxLinesOnePage = computeMaxLinesOnePage({
    marginMm,
    marginTopMm,
    bodyFontPx,
    lineSpacing,
  });

  let lines = 0;

  if (layout.header.fullName) lines += 1.5;
  if (layout.header.contactLine) lines += 1;
  lines += sectionSpacing * 0.5;

  for (const experience of layout.workExperience) {
    lines += 2 + sectionSpacing * 0.35;
    lines += experience.bullets.length * lineSpacing;
    if (experience.bullets.length > 1) {
      lines += (experience.bullets.length - 1) * Math.max(0, itemLineSpacing - lineSpacing);
    }
  }

  for (const education of layout.education) {
    lines += 1;
    lines += education.degreeLines.length;
    lines += education.achievementBullets.length * lineSpacing;
    if (education.achievementBullets.length > 1) {
      lines +=
        (education.achievementBullets.length - 1) *
        Math.max(0, itemLineSpacing - lineSpacing);
    }
    lines += sectionSpacing * 0.35;
  }

  if (layout.additionalExperienceEntries.length > 0) {
    lines += 1.5 * lineSpacing;
    if (layout.additionalExperienceEntries.length > 1) {
      lines +=
        (layout.additionalExperienceEntries.length - 1) *
        Math.max(0, itemLineSpacing - lineSpacing);
    }
    lines += sectionSpacing * 0.35;
  }

  if (layout.skillsLine) {
    lines += 1.25 * lineSpacing;
  }
  if (layout.languagesLine) {
    lines += 1.25 * lineSpacing;
    if (layout.skillsLine) {
      lines += Math.max(0, itemLineSpacing - lineSpacing);
    }
  }
  if (layout.interestsLine) {
    lines += 1.25 * lineSpacing;
    if (layout.skillsLine || layout.languagesLine) {
      lines += Math.max(0, itemLineSpacing - lineSpacing);
    }
  }

  const estimatedLines = Math.ceil(lines);
  const overflowLines = Math.max(0, estimatedLines - maxLinesOnePage);

  return {
    estimatedLines,
    maxLinesOnePage,
    exceedsOnePage: overflowLines > 0,
    overflowLines,
    estimatedPages: estimatedLines / maxLinesOnePage,
    marginMm,
    marginTopMm,
    lineSpacing,
    itemLineSpacing,
    sectionSpacing,
    bodyFontPx,
  };
}

/**
 * Preview-only resume–job fit heuristic (`preview-fit-heuristic-v1`).
 *
 * TODO(fit-rubric-v1): Replace with deterministic jdScore + profileFit from
 * docs/FIT_SCORE_RUBRIC.md. AI may explain; code must compute all numeric scores.
 */
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

  score = Math.max(0, Math.min(100, Math.round(score)));

  const optimizedFor = [
    ...(keywordUsage.slice(0, 3).map((keyword) => `Highlighted ${keyword} from approved keywords`)),
    "Selected strongest job-relevant bullets for one-page discipline",
    "Used compact Additional Experience and Skills/Languages/Interests lines",
    "Applied specific keyword-colon bullet formatting",
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
  if (keyStrengths.length === 0) {
    keyStrengths.push("Inventory-backed experience included");
  }

  const riskFlags = [
    ...globalRisks,
    ...omissions.map((item) => `Gap: ${item}`),
    ...(lowConfidenceBullets > 0
      ? [`${lowConfidenceBullets} low-confidence bullet(s) need review`]
      : []),
  ].slice(0, 6);

  return {
    fitScore: score,
    heuristicVersion: PREVIEW_FIT_HEURISTIC_VERSION,
    optimizedFor,
    scoreRationale:
      rationale?.overall ??
      "Score reflects job-description alignment, approved keyword usage, confidence levels, and stated omissions.",
    keyStrengths,
    riskFlags,
  };
}

export function layoutIncludesProfessionalSummary(content: ResumeDraftContent): boolean {
  return Boolean(content.professionalSummary?.text?.trim());
}
