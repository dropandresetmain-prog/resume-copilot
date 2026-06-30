/** Ranked slices sent to resume generation — work bullets still use MAX_RESUME_DRAFT_BULLETS. */
export const MAX_RANKED_EDUCATION_ITEMS = 3;
/** Maximum ranked skill items per inventory category (Technical Skills, Languages, etc.). */
export const MAX_RANKED_SKILL_ITEMS_PER_CATEGORY = 5;
export const MAX_RANKED_ADDITIONAL_ITEMS = 5;

export const EVIDENCE_SCORE = {
  forced: 10_000,
  acceptedWording: 1_000,
  citation: 100,
  jdTerm: 10,
  metric: 25,
  roleSignal: 6,
  redundancyPenalty: 500,
} as const;

export const OMITTED_BUT_RELEVANT_MIN_SCORE = 15;
