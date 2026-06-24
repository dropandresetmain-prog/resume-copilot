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
  };
}
