import type { ResumeDraftExperienceSection } from "@/types/resume-draft";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
  "your",
  "our",
  "this",
  "that",
  "will",
  "are",
  "be",
  "as",
  "on",
  "by",
  "from",
]);

const ROLE_SIGNAL_PATTERNS: RegExp[] = [
  /\bb2b\b/i,
  /\bsales\b/i,
  /\bbusiness development\b/i,
  /\baccount\b/i,
  /\bcommercial\b/i,
  /\bstakeholder\b/i,
  /\bpartnership\b/i,
  /\bfmcg\b/i,
  /\boperations\b/i,
  /\bproduct\b/i,
  /\bstrategy\b/i,
  /\bgo-to-market\b/i,
  /\bgrowth\b/i,
  /\bclient\b/i,
  /\bcustomer\b/i,
];

export type StoryRankingInput = {
  jobDescriptionText: string;
  roleTitle?: string;
  hiringPriorities?: string[];
};

export type RankedExperience = {
  experience: ResumeDraftExperienceSection;
  score: number;
  matchedSignals: string[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+&/-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function buildKeywordSet(input: StoryRankingInput): Set<string> {
  const combined = [
    input.jobDescriptionText,
    input.roleTitle ?? "",
    ...(input.hiringPriorities ?? []),
  ].join("\n");
  return new Set(tokenize(combined));
}

function experienceText(experience: ResumeDraftExperienceSection): string {
  const bullets = experience.bullets.map((bullet) => bullet.text).join(" ");
  return [experience.role, experience.company, experience.dateRange, bullets].filter(Boolean).join(" ");
}

function countPatternMatches(text: string, patterns: RegExp[]): string[] {
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function rankExperiencesForRole(
  experiences: ResumeDraftExperienceSection[],
  input: StoryRankingInput,
): RankedExperience[] {
  const keywords = buildKeywordSet(input);
  const jdText = [input.jobDescriptionText, input.roleTitle ?? ""].join("\n");

  return [...experiences]
    .map((experience) => {
      const text = experienceText(experience);
      const lower = text.toLowerCase();
      let score = 0;
      const matchedSignals: string[] = [];

      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score += 2;
          if (matchedSignals.length < 8) {
            matchedSignals.push(keyword);
          }
        }
      }

      const roleSignals = countPatternMatches(text, ROLE_SIGNAL_PATTERNS);
      const jdSignals = countPatternMatches(jdText, ROLE_SIGNAL_PATTERNS);
      for (const signal of roleSignals) {
        if (jdSignals.some((jdSignal) => jdSignal === signal)) {
          score += 6;
          matchedSignals.push(`role-fit:${signal}`);
        }
      }

      if (input.roleTitle && experience.role) {
        const roleTokens = tokenize(input.roleTitle);
        const expRole = experience.role.toLowerCase();
        const roleOverlap = roleTokens.filter((token) => expRole.includes(token)).length;
        score += roleOverlap * 3;
      }

      if (/singapore business federation|\bsbf\b/i.test(text) && /\bb2b\b|\bcommercial\b|\bstakeholder\b/i.test(jdText)) {
        score += 8;
        matchedSignals.push("sbf-commercial-fit");
      }

      return { experience, score, matchedSignals };
    })
    .sort((left, right) => right.score - left.score);
}

export function formatRankedExperiencesForPrompt(ranked: RankedExperience[]): string {
  if (ranked.length === 0) {
    return "(No ranked experience blocks available.)";
  }

  return ranked
    .map((entry, index) => {
      const header = [entry.experience.role, entry.experience.company, entry.experience.dateRange]
        .filter(Boolean)
        .join(" · ");
      const bullets = entry.experience.bullets
        .map((bullet) => (bullet.text?.trim() ? `- ${bullet.text.trim()}` : ""))
        .filter(Boolean)
        .join("\n");
      const signals =
        entry.matchedSignals.length > 0
          ? `Relevance signals: ${entry.matchedSignals.slice(0, 6).join(", ")}`
          : "Relevance signals: general transferable experience";
      return [
        `### Story ${index + 1} (rank ${index + 1}, score ${entry.score})`,
        header,
        signals,
        bullets,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function documentStoryRankingMethodology(): string {
  return [
    "Story ranking methodology (relevance over chronology):",
    "1. Token overlap between each experience block and the JD / role title / hiring priorities.",
    "2. Extra weight for shared commercial signals (B2B, sales, stakeholder, FMCG, partnerships, operations).",
    "3. Role-title token overlap with each experience title.",
    "4. Experiences are ordered highest score first; use Story 1–2 as primary evidence unless a lower-ranked story is uniquely decisive.",
  ].join("\n");
}
