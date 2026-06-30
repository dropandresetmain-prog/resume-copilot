import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { bulletsAreSimilar, experienceKey } from "@/lib/inventory/normalize";
import type { CollatedBullet, CollatedExperience, CollatedInventory } from "@/types/collated";
import type { SourceCitation } from "@/types/collated";
import {
  createEmptyInventoryEdits,
  type InventoryAddedBullet,
  type InventoryAddedExperience,
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

  const addedExperiences = (edits.addedExperiences ?? [])
    .filter(
      (item): item is InventoryAddedExperience =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.company === "string" &&
        item.company.trim().length > 0 &&
        typeof item.role === "string" &&
        item.role.trim().length > 0,
    )
    .map((item) => ({
      ...item,
      company: item.company.trim(),
      role: item.role.trim(),
      location: item.location?.trim() || undefined,
      dateRange: item.dateRange?.trim() || undefined,
      descriptor: item.descriptor?.trim() || undefined,
      addedAt: item.addedAt || new Date().toISOString(),
    }));

  const dismissedProjectOverlayCleanupIds = [
    ...new Set(
      (edits.dismissedProjectOverlayCleanupIds ?? []).filter(
        (id) => typeof id === "string" && id.trim(),
      ),
    ),
  ];

  const keptProjectLikeWorkExperienceIds = [
    ...new Set(
      (edits.keptProjectLikeWorkExperienceIds ?? []).filter(
        (id) => typeof id === "string" && id.trim(),
      ),
    ),
  ];

  const projectInventoryCleanupAt =
    typeof edits.projectInventoryCleanupAt === "string" &&
    edits.projectInventoryCleanupAt.trim()
      ? edits.projectInventoryCleanupAt.trim()
      : undefined;

  // ── Structured overlay for non-Work sections (M11) ──────────────────────────
  const normalizeIdList = (ids: string[] | undefined): string[] => [
    ...new Set((ids ?? []).filter((id) => typeof id === "string" && id.trim())),
  ];
  const normalizeTextById = (
    map: Record<string, string> | undefined,
  ): Record<string, string> => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(map ?? {})) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (key.trim() && trimmed) {
        next[key] = trimmed;
      }
    }
    return next;
  };

  const hiddenEducationIds = normalizeIdList(edits.hiddenEducationIds);
  const editedEducationTextById = normalizeTextById(edits.editedEducationTextById);
  const hiddenSkillIds = normalizeIdList(edits.hiddenSkillIds);
  const editedSkillTextById = normalizeTextById(edits.editedSkillTextById);
  const hiddenAdditionalIds = normalizeIdList(edits.hiddenAdditionalIds);
  const editedAdditionalTextById = normalizeTextById(edits.editedAdditionalTextById);

  return {
    hiddenBulletKeys,
    editedBulletTextByBulletKey,
    dismissedDuplicateGroupIds,
    alternateWordingBulletKeys,
    addedBulletsByExperienceKey,
    addedSkillItems,
    addedAdditionalExperienceItems,
    addedExperiences,
    dismissedProjectOverlayCleanupIds,
    keptProjectLikeWorkExperienceIds,
    projectInventoryCleanupAt,
    hiddenEducationIds,
    editedEducationTextById,
    hiddenSkillIds,
    editedSkillTextById,
    hiddenAdditionalIds,
    editedAdditionalTextById,
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

// ── Structured overlay editing for non-Work sections (M11) ───────────────────
// Education / Skills / Additional experience get the same non-destructive
// hide / edit / revert contract as work bullets, keyed by collated item id.
// "Add" for these sections is deferred to a later milestone (see roadmap M11).

function toggleIdInList(list: string[] | undefined, id: string, present: boolean): string[] {
  const current = new Set(list ?? []);
  if (present) current.add(id);
  else current.delete(id);
  return [...current];
}

function setTextOverride(
  map: Record<string, string> | undefined,
  id: string,
  text: string | null,
): Record<string, string> {
  const next = { ...(map ?? {}) };
  if (!text?.trim()) delete next[id];
  else next[id] = text.trim();
  return next;
}

export function hideInventoryEducation(edits: InventoryEdits, id: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return { ...normalized, hiddenEducationIds: toggleIdInList(normalized.hiddenEducationIds, id, true) };
}

export function restoreInventoryEducation(edits: InventoryEdits, id: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return { ...normalized, hiddenEducationIds: toggleIdInList(normalized.hiddenEducationIds, id, false) };
}

export function setInventoryEducationEdit(
  edits: InventoryEdits,
  id: string,
  text: string | null,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return {
    ...normalized,
    editedEducationTextById: setTextOverride(normalized.editedEducationTextById, id, text),
  };
}

export function hideInventorySkill(edits: InventoryEdits, id: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return { ...normalized, hiddenSkillIds: toggleIdInList(normalized.hiddenSkillIds, id, true) };
}

export function restoreInventorySkill(edits: InventoryEdits, id: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return { ...normalized, hiddenSkillIds: toggleIdInList(normalized.hiddenSkillIds, id, false) };
}

export function setInventorySkillEdit(
  edits: InventoryEdits,
  id: string,
  text: string | null,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return {
    ...normalized,
    editedSkillTextById: setTextOverride(normalized.editedSkillTextById, id, text),
  };
}

export function hideInventoryAdditional(edits: InventoryEdits, id: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return { ...normalized, hiddenAdditionalIds: toggleIdInList(normalized.hiddenAdditionalIds, id, true) };
}

export function restoreInventoryAdditional(edits: InventoryEdits, id: string): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return {
    ...normalized,
    hiddenAdditionalIds: toggleIdInList(normalized.hiddenAdditionalIds, id, false),
  };
}

export function setInventoryAdditionalEdit(
  edits: InventoryEdits,
  id: string,
  text: string | null,
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  return {
    ...normalized,
    editedAdditionalTextById: setTextOverride(normalized.editedAdditionalTextById, id, text),
  };
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

  const existingExperienceKeys = new Set(
    collated.experiences.map((item) => experienceKey(item.company, item.role)),
  );

  const overlayExperiences: CollatedExperience[] = (edits.addedExperiences ?? [])
    .filter((added) => !existingExperienceKeys.has(experienceKey(added.company, added.role)))
    .map((added) => ({
      id: added.id,
      company: added.company,
      role: added.role,
      descriptor: added.descriptor,
      location: added.location,
      dateRange: added.dateRange,
      sourceCitations: [TEXT_IMPORT_CITATION],
      bullets: [],
    }));

  const mapExperienceBullets = (experience: CollatedExperience): CollatedExperience => {
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

    const importedBullets: CollatedBullet[] = addedBullets
      .filter(
        (added) =>
          !baseBullets.some((bullet) =>
            bulletsAreSimilar(bullet.description, added.description),
          ),
      )
      .map((added) => {
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
  };

  const experiences = [
    ...collated.experiences.map(mapExperienceBullets),
    ...overlayExperiences.map(mapExperienceBullets),
  ];

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

  // ── Structured overlay for non-Work sections (M11) ──────────────────────────
  // Hide drops the item from the active view (unless includeHidden, for the edit
  // UI); an edit override replaces the displayed/generated text. Source untouched.
  const hiddenEducation = new Set(edits.hiddenEducationIds ?? []);
  const educationItems = collated.educationItems
    .filter((item) => includeHidden || !hiddenEducation.has(item.id))
    .map((item) => {
      const override = edits.editedEducationTextById?.[item.id];
      return override ? { ...item, institution: override } : item;
    });

  const hiddenSkills = new Set(edits.hiddenSkillIds ?? []);
  const baseSkills = collated.skillItems
    .filter((item) => includeHidden || !hiddenSkills.has(item.id))
    .map((item) => {
      const override = edits.editedSkillTextById?.[item.id];
      return override ? { ...item, text: override } : item;
    });

  const hiddenAdditional = new Set(edits.hiddenAdditionalIds ?? []);
  const baseAdditional = collated.additionalExperienceItems
    .filter((item) => includeHidden || !hiddenAdditional.has(item.id))
    .map((item) => {
      const override = edits.editedAdditionalTextById?.[item.id];
      return override ? { ...item, text: override } : item;
    });

  return {
    ...collated,
    experiences,
    educationItems,
    skillItems: [...baseSkills, ...addedSkills],
    additionalExperienceItems: [...baseAdditional, ...addedAdditional],
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
  const activeCollated = applyInventoryEditsToCollated(collated, edits, { includeHidden: true });
  const listings: CollatedBulletListing[] = [];

  for (const experience of activeCollated.experiences) {
    for (const bullet of experience.bullets) {
      const bulletKey =
        bullet.inventoryBulletKey ?? buildCollatedBulletKey(experience, bullet);
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
    addedExperiences: [...(edits.addedExperiences ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    dismissedProjectOverlayCleanupIds: [
      ...(edits.dismissedProjectOverlayCleanupIds ?? []),
    ].sort(),
    keptProjectLikeWorkExperienceIds: [...(edits.keptProjectLikeWorkExperienceIds ?? [])].sort(),
    projectInventoryCleanupAt: edits.projectInventoryCleanupAt ?? null,
    hiddenEducationIds: [...(edits.hiddenEducationIds ?? [])].sort(),
    editedEducationTextById: Object.fromEntries(
      Object.entries(edits.editedEducationTextById ?? {}).sort(([l], [r]) => l.localeCompare(r)),
    ),
    hiddenSkillIds: [...(edits.hiddenSkillIds ?? [])].sort(),
    editedSkillTextById: Object.fromEntries(
      Object.entries(edits.editedSkillTextById ?? {}).sort(([l], [r]) => l.localeCompare(r)),
    ),
    hiddenAdditionalIds: [...(edits.hiddenAdditionalIds ?? [])].sort(),
    editedAdditionalTextById: Object.fromEntries(
      Object.entries(edits.editedAdditionalTextById ?? {}).sort(([l], [r]) => l.localeCompare(r)),
    ),
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

export function hasInventoryExperience(
  collated: CollatedInventory,
  edits: InventoryEdits,
  company: string,
  role: string,
): boolean {
  const key = experienceKey(company, role);
  if (collated.experiences.some((item) => experienceKey(item.company, item.role) === key)) {
    return true;
  }
  return (normalizeInventoryEdits(edits).addedExperiences ?? []).some(
    (item) => experienceKey(item.company, item.role) === key,
  );
}

export function listInventoryExperienceBulletDescriptions(
  collated: CollatedInventory,
  edits: InventoryEdits,
  company: string,
  role: string,
): string[] {
  const active = applyInventoryEditsToCollated(collated, edits);
  const key = experienceKey(company, role);
  const experience = active.experiences.find(
    (item) => experienceKey(item.company, item.role) === key,
  );
  return experience?.bullets.map((bullet) => bullet.description) ?? [];
}

export function inventoryBulletDescriptionExists(
  collated: CollatedInventory,
  edits: InventoryEdits,
  company: string,
  role: string,
  description: string,
): boolean {
  return listInventoryExperienceBulletDescriptions(collated, edits, company, role).some(
    (existing) => bulletsAreSimilar(existing, description),
  );
}

export function addInventoryTextImportExperience(
  edits: InventoryEdits,
  experience: {
    company: string;
    role: string;
    location?: string;
    dateRange?: string;
    descriptor?: string;
  },
): InventoryEdits {
  const normalized = normalizeInventoryEdits(edits);
  const key = experienceKey(experience.company, experience.role);
  const alreadyOverlay = (normalized.addedExperiences ?? []).some(
    (item) => experienceKey(item.company, item.role) === key,
  );
  if (alreadyOverlay) {
    return normalized;
  }

  const nextExperience: InventoryAddedExperience = {
    id: createOverlayId(),
    company: experience.company.trim(),
    role: experience.role.trim(),
    location: experience.location?.trim() || undefined,
    dateRange: experience.dateRange?.trim() || undefined,
    descriptor: experience.descriptor?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };

  return {
    ...normalized,
    addedExperiences: [...(normalized.addedExperiences ?? []), nextExperience],
  };
}

export function addInventoryTextImportBulletIfNotDuplicate(
  edits: InventoryEdits,
  collated: CollatedInventory,
  experienceCompany: string,
  experienceRole: string,
  bullet: { description: string; keyword?: string },
): { edits: InventoryEdits; added: boolean } {
  if (
    inventoryBulletDescriptionExists(
      collated,
      edits,
      experienceCompany,
      experienceRole,
      bullet.description,
    )
  ) {
    return { edits: normalizeInventoryEdits(edits), added: false };
  }

  return {
    edits: addInventoryTextImportBullet(edits, experienceCompany, experienceRole, bullet),
    added: true,
  };
}

export function ensureInventoryTextImportExperience(
  edits: InventoryEdits,
  collated: CollatedInventory,
  experience: {
    company: string;
    role: string;
    location?: string;
    dateRange?: string;
    descriptor?: string;
  },
): InventoryEdits {
  if (hasInventoryExperience(collated, edits, experience.company, experience.role)) {
    return normalizeInventoryEdits(edits);
  }
  return addInventoryTextImportExperience(edits, experience);
}
