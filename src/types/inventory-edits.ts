/** Bullet added from pasted text import — overlay only, not source resume mutation. */
export type InventoryAddedBullet = {
  id: string;
  keyword?: string;
  description: string;
  addedAt: string;
};

export type InventoryAddedSkillItem = {
  id: string;
  category: "Languages" | "Technical Skills" | "Interests" | "Other";
  text: string;
  addedAt: string;
};

export type InventoryAddedTextItem = {
  id: string;
  category?: string;
  text: string;
  addedAt: string;
};

/** Work experience added from pasted text import — overlay only (v0.9.15B). */
export type InventoryAddedExperience = {
  id: string;
  company: string;
  role: string;
  location?: string;
  dateRange?: string;
  descriptor?: string;
  addedAt: string;
};

/**
 * Non-destructive overlay on collated inventory.
 * Does not mutate parsed resume bullets in uploaded source files.
 */
export type InventoryEdits = {
  /** bulletKey values excluded from generation (original collated description key). */
  hiddenBulletKeys: string[];
  /** bulletKey → user-edited active wording for generation. */
  editedBulletTextByBulletKey: Record<string, string>;
  /** Duplicate group IDs resolved as intentional variants (keep both). */
  dismissedDuplicateGroupIds: string[];
  /** Bullets flagged as intentional alternate wording — still active in generation. */
  alternateWordingBulletKeys: string[];
  /** experienceKey → bullets added from text import (v0.9.15A). */
  addedBulletsByExperienceKey?: Record<string, InventoryAddedBullet[]>;
  /** Skills added from text import (v0.9.15A). */
  addedSkillItems?: InventoryAddedSkillItem[];
  /** Additional experience lines added from text import (v0.9.15A). */
  addedAdditionalExperienceItems?: InventoryAddedTextItem[];
  /** Work experiences added from text import (v0.9.15B). */
  addedExperiences?: InventoryAddedExperience[];
  /** Overlay experience IDs hidden from project cleanup review (v0.9.16D). */
  dismissedProjectOverlayCleanupIds?: string[];
  /** Overlay experience IDs user chose to keep in Work Experience (v0.9.16D). */
  keptProjectLikeWorkExperienceIds?: string[];
  /** Set when project overlay cleanup is applied — prompts draft regeneration (v0.9.16D). */
  projectInventoryCleanupAt?: string;
  // ── Structured overlay editing for non-Work sections (M11) ──────────────────
  // Same non-destructive contract as work bullets: hide/edit/revert by collated
  // item id. Source resumes are never mutated. "Add" for these sections is
  // deferred to a later milestone (Education add especially) — see roadmap M11.
  /** Education item IDs hidden from generation/output (M11). */
  hiddenEducationIds?: string[];
  /** Education item id → edited institution text override (M11). */
  editedEducationTextById?: Record<string, string>;
  /** Skill item IDs hidden from generation/output (M11). */
  hiddenSkillIds?: string[];
  /** Skill item id → edited text override (M11). */
  editedSkillTextById?: Record<string, string>;
  /** Additional experience item IDs hidden from generation/output (M11). */
  hiddenAdditionalIds?: string[];
  /** Additional experience item id → edited text override (M11). */
  editedAdditionalTextById?: Record<string, string>;
};

export function createEmptyInventoryEdits(): InventoryEdits {
  return {
    hiddenBulletKeys: [],
    editedBulletTextByBulletKey: {},
    dismissedDuplicateGroupIds: [],
    alternateWordingBulletKeys: [],
    addedBulletsByExperienceKey: {},
    addedSkillItems: [],
    addedAdditionalExperienceItems: [],
    addedExperiences: [],
    dismissedProjectOverlayCleanupIds: [],
    keptProjectLikeWorkExperienceIds: [],
  };
}
