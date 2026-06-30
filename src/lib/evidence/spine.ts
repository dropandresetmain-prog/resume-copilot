import { extractJdMatchTerms } from "@/lib/resume-draft/bullet-payload";
import { areNearDuplicateBullets } from "@/lib/resume-draft/tailoring-quality";
import { collectEvidenceItems, filterAdditionalEvidenceIds } from "@/lib/evidence/collect";
import {
  EVIDENCE_SCORE,
  MAX_RANKED_ADDITIONAL_ITEMS,
  MAX_RANKED_EDUCATION_ITEMS,
  MAX_RANKED_SKILL_ITEMS_PER_CATEGORY,
  OMITTED_BUT_RELEVANT_MIN_SCORE,
} from "@/lib/evidence/constants";
import type {
  EvidenceItem,
  EvidenceSpineItemSnapshot,
  EvidenceSpineResult,
  EvidenceSpineSnapshot,
  EvidenceStoryInputs,
} from "@/lib/evidence/types";
import type { CompanyContext } from "@/types/company-context";
import type { CollatedInventory } from "@/types/collated";
import type { EnrichmentState } from "@/types/enrichment";
import type { ResumeDraftRationale, ResumeDraftRegenerationControls } from "@/types/resume-draft";

export type BuildEvidenceSpineOptions = {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  jdText: string;
  roleTitle?: string;
  maxWorkBullets: number;
  regenerationControls?: ResumeDraftRegenerationControls;
  companyContext?: CompanyContext;
  referenceDate?: Date;
  generatedAt?: string;
  acceptedWordingByBulletKey?: ReadonlyMap<string, string>;
};

function applyForcedBoost(item: EvidenceItem): EvidenceItem {
  if (item.state === "forced") {
    return { ...item, relevanceScore: item.relevanceScore + EVIDENCE_SCORE.forced };
  }
  return item;
}

function compareEvidenceItems(a: EvidenceItem, b: EvidenceItem): number {
  if (b.relevanceScore !== a.relevanceScore) {
    return b.relevanceScore - a.relevanceScore;
  }
  const aRecency = a.recencySortKey ?? 0;
  const bRecency = b.recencySortKey ?? 0;
  if (bRecency !== aRecency) {
    return bRecency - aRecency;
  }
  return a.id.localeCompare(b.id);
}

function demoteRedundantItems(items: EvidenceItem[]): EvidenceItem[] {
  const accepted: EvidenceItem[] = [];
  const proofTextsByScope = new Map<string, string[]>();

  for (const item of items) {
    if (item.eligibility === "positioning_only") {
      accepted.push(item);
      continue;
    }

    const scopeKey =
      item.sourceType === "work_bullet" && item.experience
        ? `work:${item.experience.id}`
        : item.sourceType;

    const text = `${item.editedText ?? ""} ${item.originalText}`.trim();
    const scopeTexts = proofTextsByScope.get(scopeKey) ?? [];
    const isDuplicate = scopeTexts.some((existing) => areNearDuplicateBullets(existing, text));
    if (isDuplicate && item.state !== "forced") {
      accepted.push({
        ...item,
        relevanceScore: Math.max(0, item.relevanceScore - EVIDENCE_SCORE.redundancyPenalty),
        rationale: `${item.rationale} (demoted — near-duplicate of stronger evidence)`,
      });
      continue;
    }

    accepted.push(item);
    if (text) {
      proofTextsByScope.set(scopeKey, [...scopeTexts, text]);
    }
  }

  return [...accepted].sort(compareEvidenceItems);
}

function toSnapshotItem(item: EvidenceItem): EvidenceSpineItemSnapshot {
  return {
    id: item.id,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    displayLabel: item.displayLabel,
    relevanceScore: item.relevanceScore,
    rationale: item.rationale,
    matchedJdSignals: item.matchedJdSignals,
    state: item.state,
    eligibility: item.eligibility,
  };
}

function buildHonestGaps(
  jdTerms: readonly string[],
  proofItems: readonly EvidenceItem[],
): string[] {
  const gaps: string[] = [];
  for (const term of jdTerms.slice(0, 20)) {
    const covered = proofItems.some((item) =>
      item.originalText.toLowerCase().includes(term),
    );
    if (!covered) {
      gaps.push(`JD asks for "${term}" — not clearly supported in ranked inventory evidence.`);
    }
  }
  return gaps.slice(0, 5);
}

function buildPositioningAngle(
  roleTitle: string | undefined,
  strongest: readonly EvidenceItem[],
  companyContext?: CompanyContext,
): string {
  const top = strongest.find((item) => item.sourceType === "work_bullet");
  const role = roleTitle?.trim() || "this role";
  if (top) {
    return `Lead with ${top.displayLabel} proof reframed for ${role}.`;
  }
  if (companyContext?.likelyHiringPriorities?.[0]) {
    return `Position transferable strengths against ${companyContext.likelyHiringPriorities[0]} for ${role}.`;
  }
  return `Emphasize inventory-backed outcomes most relevant to ${role}.`;
}

function buildRoleSelectionRationale(
  selectedWork: readonly EvidenceItem[],
  omittedWork: readonly EvidenceItem[],
): string {
  const selectedRoles = [
    ...new Set(selectedWork.map((item) => item.displayLabel)),
  ].slice(0, 4);
  const deferred = omittedWork
    .filter((item) => item.sourceType === "work_bullet")
    .slice(0, 2)
    .map((item) => item.displayLabel);
  const parts = [
    selectedRoles.length > 0
      ? `Selected roles: ${selectedRoles.join("; ")}.`
      : "No work bullets selected.",
  ];
  if (deferred.length > 0) {
    parts.push(`Deferred lower-relevance roles: ${deferred.join("; ")}.`);
  }
  return parts.join(" ");
}

function selectWorkBullets(
  ranked: readonly EvidenceItem[],
  maxBullets: number,
  forcedSet: ReadonlySet<string>,
  allCandidates: ReadonlyMap<string, EvidenceItem>,
): {
  selections: EvidenceSpineResult["workBulletSelections"];
  unavailableForcedKeys: string[];
} {
  const workItems = ranked.filter(
    (item) => item.sourceType === "work_bullet" && item.bullet && item.experience && item.bulletKey,
  );
  const selected: EvidenceSpineResult["workBulletSelections"] = [];
  const selectedKeys = new Set<string>();

  const unavailableForcedKeys = [...forcedSet].filter((key) => !allCandidates.has(`work_bullet:${key}`));

  for (const forcedKey of forcedSet) {
    if (selected.length >= maxBullets) {
      break;
    }
    const item = allCandidates.get(`work_bullet:${forcedKey}`);
    if (!item?.bullet || !item.experience || !item.bulletKey || selectedKeys.has(forcedKey)) {
      continue;
    }
    selected.push({
      experience: item.experience,
      bullet: item.bullet,
      bulletKey: item.bulletKey,
    });
    selectedKeys.add(forcedKey);
  }

  for (const item of workItems) {
    if (selected.length >= maxBullets) {
      break;
    }
    if (!item.bullet || !item.experience || !item.bulletKey) {
      continue;
    }
    if (selectedKeys.has(item.bulletKey)) {
      continue;
    }
    selected.push({
      experience: item.experience,
      bullet: item.bullet,
      bulletKey: item.bulletKey,
    });
    selectedKeys.add(item.bulletKey);
  }

  return { selections: selected, unavailableForcedKeys };
}

function parseSkillCategoryFromDisplayLabel(displayLabel: string): string | null {
  const separatorIndex = displayLabel.indexOf(": ");
  if (separatorIndex === -1) {
    return null;
  }
  return displayLabel.slice(0, separatorIndex);
}

function selectSkillIds(ranked: readonly EvidenceItem[]): string[] {
  const skills = ranked.filter((item) => item.sourceType === "skill");
  const selectedSourceIds: string[] = [];
  const selectedIds = new Set<string>();
  const countByCategory = new Map<string, number>();

  for (const item of skills) {
    const category = parseSkillCategoryFromDisplayLabel(item.displayLabel);
    if (!category || selectedIds.has(item.id)) {
      continue;
    }

    const categoryCount = countByCategory.get(category) ?? 0;
    if (categoryCount >= MAX_RANKED_SKILL_ITEMS_PER_CATEGORY) {
      continue;
    }

    selectedSourceIds.push(item.sourceId);
    selectedIds.add(item.id);
    countByCategory.set(category, categoryCount + 1);
  }

  return selectedSourceIds;
}

function selectAdditionalIds(
  ranked: readonly EvidenceItem[],
  forcedEvidenceSet: ReadonlySet<string>,
  excludedEvidenceSet: ReadonlySet<string>,
  additionalByEvidenceId: ReadonlyMap<string, EvidenceItem>,
): string[] {
  const additionalSlice = ranked
    .filter((item) => item.sourceType === "additional_experience")
    .slice(0, MAX_RANKED_ADDITIONAL_ITEMS);

  const selectedSourceIds = new Set<string>();
  const result: string[] = [];

  for (const item of additionalSlice) {
    if (excludedEvidenceSet.has(item.id)) {
      continue;
    }
    if (!selectedSourceIds.has(item.sourceId)) {
      selectedSourceIds.add(item.sourceId);
      result.push(item.sourceId);
    }
  }

  for (const evidenceId of forcedEvidenceSet) {
    const item = additionalByEvidenceId.get(evidenceId);
    if (!item || excludedEvidenceSet.has(evidenceId) || selectedSourceIds.has(item.sourceId)) {
      continue;
    }
    selectedSourceIds.add(item.sourceId);
    result.push(item.sourceId);
  }

  return result;
}

function selectedBulletKeysFromSnapshot(snapshot: EvidenceSpineSnapshot): string[] {
  return snapshot.items
    .filter(
      (item) =>
        item.sourceType === "work_bullet" && snapshot.selectedIds.includes(item.id),
    )
    .map((item) => item.id.replace(/^work_bullet:/, ""));
}

function shouldPreferSpineSelectedBulletKeys(
  existing: string[] | undefined,
  spineKeys: readonly string[],
): boolean {
  if (!existing || existing.length === 0) {
    return true;
  }
  if (spineKeys.length === 0) {
    return false;
  }
  const existingSet = new Set(existing);
  return spineKeys.some((key) => !existingSet.has(key));
}

export function buildEvidenceSpine(options: BuildEvidenceSpineOptions): EvidenceSpineResult {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const excludedSet = new Set(options.regenerationControls?.excludedBulletKeys ?? []);
  const forcedSet = new Set(
    (options.regenerationControls?.forcedBulletKeys ?? []).filter((key) => !excludedSet.has(key)),
  );
  const excludedEvidenceSet = new Set(
    filterAdditionalEvidenceIds(options.regenerationControls?.excludedEvidenceIds),
  );
  const forcedEvidenceSet = new Set(
    filterAdditionalEvidenceIds(options.regenerationControls?.forcedEvidenceIds).filter(
      (id) => !excludedEvidenceSet.has(id),
    ),
  );
  const rawItems = collectEvidenceItems({
    collated: options.collated,
    enrichment: options.enrichment,
    jdText: options.jdText,
    regenerationControls: options.regenerationControls,
    companyContext: options.companyContext,
    referenceDate: options.referenceDate,
    acceptedWordingByBulletKey: options.acceptedWordingByBulletKey,
  });

  const jdTerms = extractJdMatchTerms(options.jdText);
  const boosted = rawItems.map(applyForcedBoost);
  const ranked = demoteRedundantItems(boosted);

  const candidateByBulletKey = new Map(
    rawItems
      .filter((item) => item.bulletKey)
      .map((item) => [item.bulletKey!, item]),
  );

  const { selections: workBulletSelections, unavailableForcedKeys } = selectWorkBullets(
    ranked,
    options.maxWorkBullets,
    forcedSet,
    new Map(
      [...candidateByBulletKey.entries()].map(([key, item]) => [`work_bullet:${key}`, item]),
    ),
  );

  const selectedWorkKeys = new Set(workBulletSelections.map((item) => item.bulletKey));
  const selectedWorkItems = ranked.filter(
    (item) => item.sourceType === "work_bullet" && item.bulletKey && selectedWorkKeys.has(item.bulletKey),
  );

  const educationSlice = ranked
    .filter((item) => item.sourceType === "education")
    .slice(0, MAX_RANKED_EDUCATION_ITEMS);
  const additionalByEvidenceId = new Map(
    rawItems
      .filter((item) => item.sourceType === "additional_experience")
      .map((item) => [item.id, item]),
  );
  const additionalIds = selectAdditionalIds(
    ranked,
    forcedEvidenceSet,
    excludedEvidenceSet,
    additionalByEvidenceId,
  );
  const additionalSlice = ranked
    .filter(
      (item) =>
        item.sourceType === "additional_experience" && additionalIds.includes(item.sourceId),
    );
  const skillIds = selectSkillIds(ranked);

  const selectedIds = new Set<string>([
    ...selectedWorkItems.map((item) => item.id),
    ...educationSlice.map((item) => item.id),
    ...additionalSlice.map((item) => item.id),
    ...skillIds.map((id) => `skill:${id}`),
    ...ranked
      .filter((item) => item.eligibility === "positioning_only")
      .slice(0, 3)
      .map((item) => item.id),
  ]);

  const proofItems = ranked.filter((item) => item.eligibility !== "positioning_only");
  const selected = ranked.filter((item) => selectedIds.has(item.id));
  const omitted = ranked.filter((item) => !selectedIds.has(item.id) && item.eligibility !== "positioning_only");

  const strongestMatches = selected
    .filter((item) => item.sourceType !== "company_context" && item.sourceType !== "keyword_tied")
    .slice(0, 5)
    .map((item) => item.rationale);

  const honestGaps = buildHonestGaps(
    jdTerms.length > 0 ? jdTerms : [],
    proofItems,
  );
  const positioningAngle = buildPositioningAngle(
    options.roleTitle,
    selectedWorkItems,
    options.companyContext,
  );
  const roleSelectionRationale = buildRoleSelectionRationale(selectedWorkItems, omitted);
  const positioningNotes = ranked
    .filter((item) => item.eligibility === "positioning_only")
    .map((item) => item.rationale);

  const omittedButRelevant = omitted
    .filter(
      (item) =>
        item.relevanceScore >= OMITTED_BUT_RELEVANT_MIN_SCORE &&
        item.sourceType !== "keyword_tied",
    )
    .slice(0, 5);

  const storyInputs: EvidenceStoryInputs = {
    proofStoryCandidates: selected
      .filter((item) => item.sourceType !== "company_context")
      .slice(0, 5)
      .map(toSnapshotItem),
    omittedButRelevant: omittedButRelevant.map(toSnapshotItem),
    companyAlignmentNotes: positioningNotes,
    avoidOverclaimNotes: honestGaps,
  };

  const snapshot: EvidenceSpineSnapshot = {
    version: 1,
    selectedIds: [...selectedIds],
    omittedIds: omitted.map((item) => item.id),
    positioningAngle,
    honestGaps,
    strongestMatches,
    roleSelectionRationale,
    companyAlignmentNotes: positioningNotes,
    avoidOverclaimNotes: honestGaps,
    generatedAt,
    items: ranked.map(toSnapshotItem),
  };

  const totalWorkBullets = options.collated.experiences.reduce(
    (total, experience) => total + experience.bullets.length,
    0,
  );

  return {
    ranked,
    selected,
    omitted,
    workBulletSelections,
    educationIds: educationSlice.map((item) => item.sourceId),
    additionalIds,
    skillIds,
    positioningNotes,
    honestGaps,
    positioningAngle,
    strongestMatches,
    roleSelectionRationale,
    snapshot,
    storyInputs,
    jdTerms,
    unavailableForcedKeys,
    totalWorkBullets,
  };
}

export function mergeSpineSnapshotIntoSelectionAudit(
  snapshot: EvidenceSpineSnapshot,
  existing?: ResumeDraftRationale["selectionAudit"],
): NonNullable<ResumeDraftRationale["selectionAudit"]> {
  const spineSelectedBulletKeys = selectedBulletKeysFromSnapshot(snapshot);
  return {
    jdThemes: snapshot.items
      .flatMap((item) => item.matchedJdSignals)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 12),
    strongestMatches: snapshot.strongestMatches,
    honestGaps: snapshot.honestGaps,
    positioningAngle: snapshot.positioningAngle,
    roleSelectionRationale: snapshot.roleSelectionRationale,
    selectedBulletKeys: shouldPreferSpineSelectedBulletKeys(
      existing?.selectedBulletKeys,
      spineSelectedBulletKeys,
    )
      ? spineSelectedBulletKeys
      : existing!.selectedBulletKeys!,
    acceptedWordingUsed: existing?.acceptedWordingUsed ?? [],
    approvedKeywordsUsed: existing?.approvedKeywordsUsed ?? [],
    approvedKeywordsSkipped: existing?.approvedKeywordsSkipped ?? [],
  };
}

export function mergeSpineIntoSelectionAudit(
  spine: EvidenceSpineResult,
  existing?: ResumeDraftRationale["selectionAudit"],
): NonNullable<ResumeDraftRationale["selectionAudit"]> {
  const spineSelectedBulletKeys = spine.workBulletSelections.map((item) => item.bulletKey);
  return {
    jdThemes: spine.jdTerms.slice(0, 12),
    strongestMatches: spine.strongestMatches,
    honestGaps: spine.honestGaps,
    positioningAngle: spine.positioningAngle,
    roleSelectionRationale: spine.roleSelectionRationale,
    selectedBulletKeys: shouldPreferSpineSelectedBulletKeys(
      existing?.selectedBulletKeys,
      spineSelectedBulletKeys,
    )
      ? spineSelectedBulletKeys
      : existing!.selectedBulletKeys!,
    acceptedWordingUsed: existing?.acceptedWordingUsed ?? [],
    approvedKeywordsUsed: existing?.approvedKeywordsUsed ?? [],
    approvedKeywordsSkipped: existing?.approvedKeywordsSkipped ?? [],
  };
}
