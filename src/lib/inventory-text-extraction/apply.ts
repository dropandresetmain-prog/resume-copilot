import { upsertKeywordBankItem } from "@/lib/enrichment/state";
import {
  addInventoryTextImportAdditionalExperience,
  addInventoryTextImportBulletIfNotDuplicate,
  addInventoryTextImportExperience,
  addInventoryTextImportSkill,
  ensureInventoryTextImportExperience,
  hasInventoryExperience,
  normalizeInventoryEdits,
} from "@/lib/inventory/edits";
import {
  coerceProjectLikeSuggestionToAdditional,
  isProjectLikeTextImportSuggestion,
} from "@/lib/inventory-text-extraction/project-guard";
import { experienceKey } from "@/lib/inventory/normalize";
import { isBulletSuggestionKind } from "@/lib/inventory-text-extraction/classify";
import type { EnrichmentState } from "@/types/enrichment";
import type { InventoryEdits } from "@/types/inventory-edits";
import type {
  InventoryTextExtractionSuggestion,
  InventoryTextSuggestionKind,
  ReviewedInventoryTextSuggestion,
} from "@/types/inventory-text-extraction";
import type { CollatedInventory } from "@/types/collated";

export type SkippedInventoryTextSuggestion = {
  suggestionId: string;
  kind: InventoryTextSuggestionKind;
  summary: string;
  reason: string;
};

export type AppliedInventoryTextSuggestion = {
  suggestionId: string;
  kind: InventoryTextSuggestionKind;
  summary: string;
};

export type ApplyInventoryTextExtractionResult = {
  edits: InventoryEdits;
  enrichment: EnrichmentState;
  appliedCount: number;
  skippedCount: number;
  skippedReasons: string[];
  appliedItems: AppliedInventoryTextSuggestion[];
  skippedItems: SkippedInventoryTextSuggestion[];
};

function effectiveSuggestionText(suggestion: ReviewedInventoryTextSuggestion): string {
  return suggestion.editedText?.trim() || suggestion.text.trim();
}

function suggestionSummary(suggestion: ReviewedInventoryTextSuggestion): string {
  const text = effectiveSuggestionText(suggestion);
  if (suggestion.company && suggestion.role) {
    return `${suggestion.company} · ${suggestion.role}: ${text.slice(0, 80)}`;
  }
  return text.slice(0, 120);
}

function resolveExperienceForBullet(
  suggestion: InventoryTextExtractionSuggestion,
  collated: CollatedInventory,
  edits: InventoryEdits,
): { company: string; role: string } | null {
  if (suggestion.mappedExperienceKey) {
    const match = collated.experiences.find(
      (item) => experienceKey(item.company, item.role) === suggestion.mappedExperienceKey,
    );
    if (match) {
      return { company: match.company, role: match.role };
    }

    const overlay = (edits.addedExperiences ?? []).find(
      (item) => experienceKey(item.company, item.role) === suggestion.mappedExperienceKey,
    );
    if (overlay) {
      return { company: overlay.company, role: overlay.role };
    }
  }

  const company = suggestion.company?.trim();
  const role = suggestion.role?.trim();
  if (!company || !role) return null;

  const collatedMatch = collated.experiences.find(
    (item) => experienceKey(item.company, item.role) === experienceKey(company, role),
  );
  if (collatedMatch) {
    return { company: collatedMatch.company, role: collatedMatch.role };
  }

  if (hasInventoryExperience(collated, edits, company, role)) {
    return { company, role };
  }

  return { company, role };
}

function recordSkip(
  skippedItems: SkippedInventoryTextSuggestion[],
  skippedReasons: string[],
  suggestion: ReviewedInventoryTextSuggestion,
  reason: string,
) {
  skippedItems.push({
    suggestionId: suggestion.id,
    kind: suggestion.kind,
    summary: suggestionSummary(suggestion),
    reason,
  });
  skippedReasons.push(reason);
}

function recordApplied(
  appliedItems: AppliedInventoryTextSuggestion[],
  suggestion: ReviewedInventoryTextSuggestion,
) {
  appliedItems.push({
    suggestionId: suggestion.id,
    kind: suggestion.kind,
    summary: suggestionSummary(suggestion),
  });
}

function coerceAcceptedSuggestion(
  suggestion: ReviewedInventoryTextSuggestion,
): ReviewedInventoryTextSuggestion {
  const coerced = coerceProjectLikeSuggestionToAdditional({
    ...suggestion,
    text: effectiveSuggestionText(suggestion),
  });
  return {
    ...coerced,
    reviewStatus: suggestion.reviewStatus,
    editedText: suggestion.editedText,
  };
}

function applyProjectAsAdditionalExperience(
  edits: InventoryEdits,
  suggestion: ReviewedInventoryTextSuggestion,
  text: string,
): InventoryEdits {
  const coerced = coerceProjectLikeSuggestionToAdditional({
    ...suggestion,
    text,
  });
  return addInventoryTextImportAdditionalExperience(edits, {
    text: coerced.text,
    category: coerced.keyword ?? "Projects",
  });
}

export function applyAcceptedInventoryTextSuggestions(
  accepted: ReviewedInventoryTextSuggestion[],
  currentEdits: InventoryEdits,
  enrichment: EnrichmentState,
  collated: CollatedInventory,
): ApplyInventoryTextExtractionResult {
  let edits = normalizeInventoryEdits(currentEdits);
  let keywordBank = enrichment.keywordBank;
  let appliedCount = 0;
  let skippedCount = 0;
  const skippedReasons: string[] = [];
  const appliedItems: AppliedInventoryTextSuggestion[] = [];
  const skippedItems: SkippedInventoryTextSuggestion[] = [];

  const acceptedOnly = accepted
    .filter((item) => item.reviewStatus === "accepted")
    .map((item) => coerceAcceptedSuggestion(item));

  const workExperiences = acceptedOnly.filter((item) => item.kind === "new_work_experience");
  const bullets = acceptedOnly.filter((item) => isBulletSuggestionKind(item.kind));
  const others = acceptedOnly.filter(
    (item) =>
      !isBulletSuggestionKind(item.kind) &&
      item.kind !== "new_work_experience",
  );

  for (const suggestion of workExperiences) {
    const text = effectiveSuggestionText(suggestion);
    if (!text) {
      skippedCount += 1;
      recordSkip(skippedItems, skippedReasons, suggestion, "Skipped empty work experience suggestion.");
      continue;
    }

    if (isProjectLikeTextImportSuggestion(suggestion)) {
      edits = applyProjectAsAdditionalExperience(edits, suggestion, text);
      appliedCount += 1;
      recordApplied(appliedItems, suggestion);
      continue;
    }

    if (suggestion.applyability === "preview_only") {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Preview only — education and unsupported kinds cannot be applied yet.",
      );
      continue;
    }

    if (suggestion.applyability === "needs_manual_placement") {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Needs manual placement — add company and role, or use bullets for an existing role.",
      );
      continue;
    }

    const company = suggestion.company?.trim();
    const role = suggestion.role?.trim();
    if (!company || !role) {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Needs manual placement — company and role are required for new work experience.",
      );
      continue;
    }

    if (hasInventoryExperience(collated, edits, company, role)) {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        `Experience already in inventory: ${company} · ${role}. Add bullets instead.`,
      );
      continue;
    }

    edits = addInventoryTextImportExperience(edits, {
      company,
      role,
      location: suggestion.keyword,
      dateRange: suggestion.dateRange,
      descriptor: text,
    });
    appliedCount += 1;
    recordApplied(appliedItems, suggestion);
  }

  for (const suggestion of bullets) {
    const text = effectiveSuggestionText(suggestion);
    if (!text) {
      skippedCount += 1;
      recordSkip(skippedItems, skippedReasons, suggestion, "Skipped empty bullet suggestion.");
      continue;
    }

    if (isProjectLikeTextImportSuggestion(suggestion)) {
      edits = applyProjectAsAdditionalExperience(edits, suggestion, text);
      appliedCount += 1;
      recordApplied(appliedItems, suggestion);
      continue;
    }

    if (suggestion.applyability === "preview_only") {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Preview only — this bullet kind is not supported yet.",
      );
      continue;
    }

    if (suggestion.applyability === "needs_manual_placement") {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Needs manual placement — specify company and role so the bullet can be placed.",
      );
      continue;
    }

    if (suggestion.duplicateOfBulletKey) {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Duplicate of an existing inventory bullet — not added.",
      );
      continue;
    }

    const target = resolveExperienceForBullet(suggestion, collated, edits);
    if (!target) {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Could not map bullet to a company/role.",
      );
      continue;
    }

    edits = ensureInventoryTextImportExperience(edits, collated, {
      company: target.company,
      role: target.role,
      dateRange: suggestion.dateRange,
    });

    const bulletResult = addInventoryTextImportBulletIfNotDuplicate(
      edits,
      collated,
      target.company,
      target.role,
      {
        description: text,
        keyword: suggestion.keyword,
      },
    );
    edits = bulletResult.edits;

    if (!bulletResult.added) {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        `Duplicate bullet not added for ${target.company} · ${target.role}.`,
      );
      continue;
    }

    appliedCount += 1;
    recordApplied(appliedItems, suggestion);
  }

  for (const suggestion of others) {
    const text = effectiveSuggestionText(suggestion);
    if (!text) {
      skippedCount += 1;
      recordSkip(skippedItems, skippedReasons, suggestion, `Skipped empty ${suggestion.kind} suggestion.`);
      continue;
    }

    if (suggestion.applyability === "preview_only") {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        `Preview only: ${suggestion.kind} is not persisted yet.`,
      );
      continue;
    }

    if (suggestion.applyability === "needs_manual_placement") {
      skippedCount += 1;
      recordSkip(
        skippedItems,
        skippedReasons,
        suggestion,
        "Needs manual placement before this suggestion can be applied.",
      );
      continue;
    }

    switch (suggestion.kind) {
      case "skill": {
        edits = addInventoryTextImportSkill(edits, {
          text,
          category: "Technical Skills",
        });
        appliedCount += 1;
        recordApplied(appliedItems, suggestion);
        break;
      }
      case "additional_experience": {
        edits = addInventoryTextImportAdditionalExperience(edits, {
          text,
          category: suggestion.keyword,
        });
        appliedCount += 1;
        recordApplied(appliedItems, suggestion);
        break;
      }
      case "keyword": {
        keywordBank = upsertKeywordBankItem(keywordBank, text, "ai_suggested", true);
        appliedCount += 1;
        recordApplied(appliedItems, suggestion);
        break;
      }
      default:
        skippedCount += 1;
        recordSkip(
          skippedItems,
          skippedReasons,
          suggestion,
          `Unsupported apply kind: ${suggestion.kind}`,
        );
    }
  }

  return {
    edits,
    enrichment: {
      ...enrichment,
      keywordBank,
    },
    appliedCount,
    skippedCount,
    skippedReasons,
    appliedItems,
    skippedItems,
  };
}
