import { upsertKeywordBankItem } from "@/lib/enrichment/state";
import {
  addInventoryTextImportAdditionalExperience,
  addInventoryTextImportBullet,
  addInventoryTextImportSkill,
  normalizeInventoryEdits,
} from "@/lib/inventory/edits";
import { experienceKey } from "@/lib/inventory/normalize";
import type { EnrichmentState } from "@/types/enrichment";
import type { InventoryEdits } from "@/types/inventory-edits";
import type {
  InventoryTextExtractionSuggestion,
  ReviewedInventoryTextSuggestion,
} from "@/types/inventory-text-extraction";
import type { CollatedInventory } from "@/types/collated";

export type ApplyInventoryTextExtractionResult = {
  edits: InventoryEdits;
  enrichment: EnrichmentState;
  appliedCount: number;
  skippedCount: number;
  skippedReasons: string[];
};

function effectiveSuggestionText(suggestion: ReviewedInventoryTextSuggestion): string {
  return suggestion.editedText?.trim() || suggestion.text.trim();
}

function resolveExperienceForBullet(
  suggestion: InventoryTextExtractionSuggestion,
  collated: CollatedInventory,
): { company: string; role: string } | null {
  if (suggestion.mappedExperienceKey) {
    const match = collated.experiences.find(
      (item) => experienceKey(item.company, item.role) === suggestion.mappedExperienceKey,
    );
    if (match) {
      return { company: match.company, role: match.role };
    }
  }

  const company = suggestion.company?.trim();
  const role = suggestion.role?.trim();
  if (!company || !role) return null;

  const match = collated.experiences.find(
    (item) => experienceKey(item.company, item.role) === experienceKey(company, role),
  );
  if (match) {
    return { company: match.company, role: match.role };
  }

  return { company, role };
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

  for (const suggestion of accepted) {
    if (suggestion.reviewStatus !== "accepted") continue;

    const text = effectiveSuggestionText(suggestion);
    if (!text) {
      skippedCount += 1;
      skippedReasons.push(`Skipped empty suggestion (${suggestion.kind}).`);
      continue;
    }

    if (suggestion.applyability !== "applyable") {
      skippedCount += 1;
      skippedReasons.push(
        `Preview only: ${suggestion.kind} is not persisted in v0.9.15A.`,
      );
      continue;
    }

    switch (suggestion.kind) {
      case "bullet_existing_experience": {
        const target = resolveExperienceForBullet(suggestion, collated);
        if (!target) {
          skippedCount += 1;
          skippedReasons.push(
            `Could not map bullet to an existing experience: "${text.slice(0, 60)}…"`,
          );
          break;
        }
        edits = addInventoryTextImportBullet(edits, target.company, target.role, {
          description: text,
          keyword: suggestion.keyword,
        });
        appliedCount += 1;
        break;
      }
      case "skill": {
        edits = addInventoryTextImportSkill(edits, {
          text,
          category: "Technical Skills",
        });
        appliedCount += 1;
        break;
      }
      case "additional_experience": {
        edits = addInventoryTextImportAdditionalExperience(edits, {
          text,
          category: suggestion.keyword,
        });
        appliedCount += 1;
        break;
      }
      case "keyword": {
        keywordBank = upsertKeywordBankItem(keywordBank, text, "ai_suggested", true);
        appliedCount += 1;
        break;
      }
      default:
        skippedCount += 1;
        skippedReasons.push(`Unsupported apply kind: ${suggestion.kind}`);
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
  };
}
