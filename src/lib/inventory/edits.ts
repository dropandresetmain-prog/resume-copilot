import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import type { CollatedBullet, CollatedExperience, CollatedInventory } from "@/types/collated";
import {
  createEmptyInventoryEdits,
  type InventoryEdits,
} from "@/types/inventory-edits";

export function buildCollatedBulletKey(
  experience: Pick<CollatedExperience, "company" | "role">,
  bullet: Pick<CollatedBullet, "description">,
): string {
  return buildBulletEnrichmentKey(experience.company, experience.role, bullet.description);
}

export function normalizeInventoryEdits(edits: InventoryEdits | undefined): InventoryEdits {
  if (!edits) {
    return createEmptyInventoryEdits();
  }

  const hiddenBulletKeys = [
    ...new Set(
      edits.hiddenBulletKeys.filter((key) => typeof key === "string" && key.trim()),
    ),
  ];

  const editedBulletTextByBulletKey: Record<string, string> = {};
  for (const [key, value] of Object.entries(edits.editedBulletTextByBulletKey ?? {})) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (key.trim() && trimmed) {
      editedBulletTextByBulletKey[key] = trimmed;
    }
  }

  return { hiddenBulletKeys, editedBulletTextByBulletKey };
}

export function isBulletHidden(edits: InventoryEdits, bulletKey: string): boolean {
  return edits.hiddenBulletKeys.includes(bulletKey);
}

export function hideInventoryBullet(edits: InventoryEdits, bulletKey: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  if (normalized.hiddenBulletKeys.includes(bulletKey)) {
    return normalized;
  }
  return {
    ...normalized,
    hiddenBulletKeys: [...normalized.hiddenBulletKeys, bulletKey],
  };
}

export function restoreInventoryBullet(edits: InventoryEdits, bulletKey: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return {
    ...normalized,
    hiddenBulletKeys: normalized.hiddenBulletKeys.filter((key) => key !== bulletKey),
  };
}

export function setInventoryBulletEdit(
  edits: InventoryEdits,
  bulletKey: string,
  text: string | null,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const nextEdits = { ...normalized.editedBulletTextByBulletKey };

  if (!text?.trim()) {
    delete nextEdits[bulletKey];
  } else {
    nextEdits[bulletKey] = text.trim();
  }

  return {
    ...normalized,
    editedBulletTextByBulletKey: nextEdits,
  };
}

export function getEffectiveBulletDescription(
  edits: InventoryEdits,
  bulletKey: string,
  originalDescription: string,
): string {
  return edits.editedBulletTextByBulletKey[bulletKey] ?? originalDescription;
}

/**
 * Apply inventory edit overlay to a derived collated view.
 * Does not mutate source parsed resumes.
 */
export function applyInventoryEditsToCollated(
  collated: CollatedInventory,
  editsInput: InventoryEdits | undefined,
  options?: { includeHidden?: boolean },
): CollatedInventory {
  const edits = normalizeInventoryEdits(editsInput);
  const hidden = new Set(edits.hiddenBulletKeys);
  const includeHidden = options?.includeHidden ?? false;

  return {
    ...collated,
    experiences: collated.experiences.map((experience) => ({
      ...experience,
      bullets: experience.bullets.flatMap((bullet) => {
        const inventoryBulletKey = buildCollatedBulletKey(experience, bullet);
        const hiddenBullet = hidden.has(inventoryBulletKey);

        if (hiddenBullet && !includeHidden) {
          return [];
        }

        const editedText = edits.editedBulletTextByBulletKey[inventoryBulletKey];
        return [
          {
            ...bullet,
            inventoryBulletKey,
            description: editedText ?? bullet.description,
          },
        ];
      }),
    })),
  };
}

export type CollatedBulletListing = {
  experience: CollatedExperience;
  bullet: CollatedBullet;
  bulletKey: string;
  isHidden: boolean;
  editedText?: string;
  effectiveDescription: string;
};

export function listCollatedBulletsWithEditState(
  collated: CollatedInventory,
  editsInput: InventoryEdits | undefined,
): CollatedBulletListing[] {
  const edits = normalizeInventoryEdits(editsInput);
  const listings: CollatedBulletListing[] = [];

  for (const experience of collated.experiences) {
    for (const bullet of experience.bullets) {
      const bulletKey = buildCollatedBulletKey(experience, bullet);
      const editedText = edits.editedBulletTextByBulletKey[bulletKey];
      const isHidden = edits.hiddenBulletKeys.includes(bulletKey);
      listings.push({
        experience,
        bullet,
        bulletKey,
        isHidden,
        editedText,
        effectiveDescription: editedText ?? bullet.description,
      });
    }
  }

  return listings;
}

export function countHiddenInventoryBullets(edits: InventoryEdits | undefined): number {
  return normalizeInventoryEdits(edits).hiddenBulletKeys.length;
}

export function countEditedInventoryBullets(edits: InventoryEdits | undefined): number {
  return Object.keys(normalizeInventoryEdits(edits).editedBulletTextByBulletKey).length;
}
