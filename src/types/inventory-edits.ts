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
};

export function createEmptyInventoryEdits(): InventoryEdits {
  return {
    hiddenBulletKeys: [],
    editedBulletTextByBulletKey: {},
    dismissedDuplicateGroupIds: [],
    alternateWordingBulletKeys: [],
  };
}
