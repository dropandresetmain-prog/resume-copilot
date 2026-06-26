import type { CollatedBullet, CollatedExperience } from "@/types/collated";

export type EvidenceSourceType =
  | "work_bullet"
  | "additional_experience"
  | "education"
  | "skill"
  | "keyword_tied"
  | "company_context";

export type EvidenceEligibility =
  | "resume"
  | "cover_letter"
  | "both"
  | "positioning_only";

export type EvidenceItemState = "default" | "forced" | "excluded" | "hidden";

export type EvidenceItem = {
  id: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  originalText: string;
  displayLabel: string;
  editedText?: string;
  state: EvidenceItemState;
  provenance: "inventory" | "overlay" | "context";
  confidence: "high" | "medium" | "low";
  relevanceScore: number;
  matchedJdSignals: string[];
  rationale: string;
  eligibility: EvidenceEligibility;
  hasMetrics: boolean;
  recencySortKey?: number;
  bulletKey?: string;
  experience?: CollatedExperience;
  bullet?: CollatedBullet;
  acceptedWording?: string;
};

export type EvidenceSpineItemSnapshot = {
  id: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  displayLabel: string;
  relevanceScore: number;
  rationale: string;
  matchedJdSignals: string[];
  state: EvidenceItemState;
  eligibility: EvidenceEligibility;
};

export type EvidenceSpineSnapshot = {
  version: 1;
  selectedIds: string[];
  omittedIds: string[];
  positioningAngle: string;
  honestGaps: string[];
  strongestMatches: string[];
  roleSelectionRationale?: string;
  companyAlignmentNotes?: string[];
  avoidOverclaimNotes?: string[];
  generatedAt: string;
  items: EvidenceSpineItemSnapshot[];
};

export type EvidenceStoryInputs = {
  proofStoryCandidates: EvidenceSpineItemSnapshot[];
  omittedButRelevant: EvidenceSpineItemSnapshot[];
  companyAlignmentNotes: string[];
  avoidOverclaimNotes: string[];
};

export type EvidenceSpineResult = {
  ranked: EvidenceItem[];
  selected: EvidenceItem[];
  omitted: EvidenceItem[];
  workBulletSelections: Array<{
    experience: CollatedExperience;
    bullet: CollatedBullet;
    bulletKey: string;
  }>;
  educationIds: string[];
  additionalIds: string[];
  skillIds: string[];
  positioningNotes: string[];
  honestGaps: string[];
  positioningAngle: string;
  strongestMatches: string[];
  roleSelectionRationale: string;
  snapshot: EvidenceSpineSnapshot;
  storyInputs: EvidenceStoryInputs;
  jdTerms: string[];
  unavailableForcedKeys: string[];
  totalWorkBullets: number;
};
