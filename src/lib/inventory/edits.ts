import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { experienceKey } from "@/lib/inventory/normalize";
import type { CollatedBullet, CollatedExperience, CollatedInventory } from "@/types/collated";
import type { SourceCitation } from "@/types/collated";
import {
  createEmptyInventoryEdits,
  type InventoryAddedBullet,
  type InventoryAddedSkillItem,
  type InventoryAddedTextItem,
  type InventoryEdits,
} from "@/types/inventory-edits";

const TEXT_IMPORT_CITATION: SourceCitation = {
  resumeId: "text-import",
  filename: "Pasted text",
};

export function buildCollatedBulletKey(
  experience: Pick<CollatedExperience, "company" | "role">,
  bullet: Pick<CollatedBullet, "description">,
): string {
  return buildBulletEnrichmentKey(experience.company, experience.role, bullet.description);
}

export function buildTextImportBulletKey(
  experienceCompany: string,
  experienceRole: string,
  bulletId: string,
): string {
  return `text-import::${experienceKey(experienceCompany, experienceRole)}::${bulletId}`;
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

  const dismissedDuplicateGroupIds = [
    ...new Set(
      (edits.dismissedDuplicateGroupIds ?? []).filter(
        (id) => typeof id === "string" && id.trim(),
      ),
    ),
  ];

  const alternateWordingBulletKeys = [
    ...new Set(
      (edits.alternateWordingBulletKeys ?? []).filter(
        (key) => typeof key === "string" && key.trim(),
      ),
    ),
  ];

  const addedBulletsByExperienceKey: Record<string, InventoryAddedBullet[]> = {};
  for (const [key, bullets] of Object.entries(edits.addedBulletsByExperienceKey ?? {})) {
    if (!key.trim() || !Array.isArray(bullets)) continue;
    const normalized = bullets
      .filter(
        (bullet): bullet is InventoryAddedBullet =>
          typeof bullet === "object" &&
          bullet !== null &&
          typeof bullet.id === "string" &&
          typeof bullet.description === "string" &&
          bullet.description.trim().length > 0,
      )
      .map((bullet) => ({
        ...bullet,
        description: bullet.description.trim(),
        keyword: bullet.keyword?.trim() || undefined,
        addedAt: bullet.addedAt || new Date().toISOString(),
      }));
    if (normalized.length > 0) {
      addedBulletsByExperienceKey[key] = normalized;
    }
  }

  const addedSkillItems = (edits.addedSkillItems ?? [])
    .filter(
      (item): item is InventoryAddedSkillItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        item.text.trim().length > 0,
    )
    .map((item) => ({
      ...item,
      text: item.text.trim(),
      addedAt: item.addedAt || new Date().toISOString(),
    }));

  const addedAdditionalExperienceItems = (edits.addedAdditionalExperienceItems ?? [])
    .filter(
      (item): item is InventoryAddedTextItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        item.text.trim().length > 0,
    )
    .map((item) => ({
      ...item,
      text: item.text.trim(),
      category: item.category?.trim() || undefined,
      addedAt: item.addedAt || new Date().toISOString(),
    }));

  return {
    hiddenBulletKeys,
    editedBulletTextByBulletKey,
    dismissedDuplicateGroupIds,
    alternateWordingBulletKeys,
    addedBulletsByExperienceKey,
    addedSkillItems,
    addedAdditionalExperienceItems,
  };
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

  const experiences = collated.experiences.map((experience) => {
    const key = experienceKey(experience.company, experience.role);
    const addedBullets = edits.addedBulletsByExperienceKey?.[key] ?? [];

    const baseBullets = experience.bullets.flatMap((bullet) => {
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
    });

    const importedBullets: CollatedBullet[] = addedBullets.map((added) => {
      const inventoryBulletKey = buildTextImportBulletKey(
        experience.company,
        experience.role,
        added.id,
      );
      return {
        id: added.id,
        keyword: added.keyword,
        description: added.description,
        rawTexts: [added.description],
        sourceCitations: [TEXT_IMPORT_CITATION],
        inventoryBulletKey,
      };
    });

    return {
      ...experience,
      bullets: [...baseBullets, ...importedBullets],
    };
  });

  const addedSkills = (edits.addedSkillItems ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    text: item.text,
    sourceCitations: [TEXT_IMPORT_CITATION],
  }));

  const addedAdditional = (edits.addedAdditionalExperienceItems ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    text: item.text,
    rawTexts: [item.text],
    sourceCitations: [TEXT_IMPORT_CITATION],
  }));

  return {
    ...collated,
    experiences,
    skillItems: [...collated.skillItems, ...addedSkills],
    additionalExperienceItems: [
      ...collated.additionalExperienceItems,
      ...addedAdditional,
    ],
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

export function dismissInventoryDuplicateGroup(
  edits: InventoryEdits,
  groupId: string,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  if (normalized.dismissedDuplicateGroupIds.includes(groupId)) {
    return normalized;
  }
  return {
    ...normalized,
    dismissedDuplicateGroupIds: [...normalized.dismissedDuplicateGroupIds, groupId],
  };
}

export function keepOneInventoryDuplicateBullet(
  edits: InventoryEdits,
  group: { id: string; bulletKeys: string[] },
  keptBulletKey: string,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const hidden = new Set(normalized.hiddenBulletKeys);

  for (const bulletKey of group.bulletKeys) {
    if (bulletKey !== keptBulletKey) {
      hidden.add(bulletKey);
    } else {
      hidden.delete(bulletKey);
    }
  }

  const alternate = normalized.alternateWordingBulletKeys.filter(
    (key) => key === keptBulletKey || !group.bulletKeys.includes(key),
  );

  return dismissInventoryDuplicateGroup(
    {
      ...normalized,
      hiddenBulletKeys: [...hidden],
      alternateWordingBulletKeys: alternate,
    },
    group.id,
  );
}

export function keepBothInventoryDuplicateGroup(
  edits: InventoryEdits,
  group: { id: string; bulletKeys: string[] },
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const hidden = normalized.hiddenBulletKeys.filter(
    (key) => !group.bulletKeys.includes(key),
  );

  return dismissInventoryDuplicateGroup(
    {
      ...normalized,
      hiddenBulletKeys: hidden,
    },
    group.id,
  );
}

export function hideInventoryDuplicateBullet(
  edits: InventoryEdits,
  bulletKey: string,
): InventoryEdits {
  return hideInventoryBullet(edits, bulletKey);
}

export function markInventoryAlternateWording(
  edits: InventoryEdits,
  bulletKey: string,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  if (normalized.alternateWordingBulletKeys.includes(bulletKey)) {
    return normalized;
  }
  return {
    ...normalized,
    alternateWordingBulletKeys: [...normalized.alternateWordingBulletKeys, bulletKey],
  };
}

export function clearInventoryAlternateWording(
  edits: InventoryEdits,
  bulletKey: string,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return {
    ...normalized,
    alternateWordingBulletKeys: normalized.alternateWordingBulletKeys.filter(
      (key) => key !== bulletKey,
    ),
  };
}

export function isInventoryAlternateWording(
  edits: InventoryEdits | undefined,
  bulletKey: string,
): boolean {
  return normalizeInventoryEdits(edits).alternateWordingBulletKeys.includes(bulletKey);
}

function serializeInventoryEditsForCompare(edits: InventoryEdits): string {
  const addedBullets = Object.fromEntries(
    Object.entries(edits.addedBulletsByExperienceKey ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, bullets]) => [
        key,
        [...bullets].sort((left, right) => left.id.localeCompare(right.id)),
      ]),
  );

  return JSON.stringify({
    hiddenBulletKeys: [...edits.hiddenBulletKeys].sort(),
    editedBulletTextByBulletKey: Object.fromEntries(
      Object.entries(edits.editedBulletTextByBulletKey).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    dismissedDuplicateGroupIds: [...edits.dismissedDuplicateGroupIds].sort(),
    alternateWordingBulletKeys: [...edits.alternateWordingBulletKeys].sort(),
    addedBulletsByExperienceKey: addedBullets,
    addedSkillItems: [...(edits.addedSkillItems ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    addedAdditionalExperienceItems: [
      ...(edits.addedAdditionalExperienceItems ?? []),
    ].sort((left, right) => left.id.localeCompare(right.id)),
  });
}

export function inventoryEditsEqual(
  left: InventoryEdits | undefined,
  right: InventoryEdits | undefined,
): boolean {
  return (
    serializeInventoryEditsForCompare(normalizeInventoryEdits(left)) ===
    serializeInventoryEditsForCompare(normalizeInventoryEdits(right))
  );
}

function createOverlayId(): string {
  return crypto.randomUUID();
}

export function addInventoryTextImportBullet(
  edits: InventoryEdits,
  experienceCompany: string,
  experienceRole: string,
  bullet: { description: string; keyword?: string },
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const key = experienceKey(experienceCompany, experienceRole);
  const nextBullet: InventoryAddedBullet = {
    id: createOverlayId(),
    description: bullet.description.trim(),
    keyword: bullet.keyword?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };
  const existing = normalized.addedBulletsByExperienceKey?.[key] ?? [];

  return {
    ...normalized,
    addedBulletsByExperienceKey: {
      ...normalized.addedBulletsByExperienceKey,
      [key]: [...existing, nextBullet],
    },
  };
}

export function addInventoryTextImportSkill(
  edits: InventoryEdits,
  skill: { text: string; category?: InventoryAddedSkillItem["category"] },
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const nextItem: InventoryAddedSkillItem = {
    id: createOverlayId(),
    text: skill.text.trim(),
    category: skill.category ?? "Other",
    addedAt: new Date().toISOString(),
  };

  return {
    ...normalized,
    addedSkillItems: [...(normalized.addedSkillItems ?? []), nextItem],
  };
}

export function addInventoryTextImportAdditionalExperience(
  edits: InventoryEdits,
  item: { text: string; category?: string },
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const nextItem: InventoryAddedTextItem = {
    id: createOverlayId(),
    text: item.text.trim(),
    category: item.category?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };

  return {
    ...normalized,
    addedAdditionalExperienceItems: [
      ...(normalized.addedAdditionalExperienceItems ?? []),
      nextItem,
    ],
  };
}
