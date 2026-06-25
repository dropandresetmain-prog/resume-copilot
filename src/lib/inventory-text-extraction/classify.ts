import { experienceKey } from "@/lib/inventory/normalize";
import { hasInventoryExperience } from "@/lib/inventory/edits";
import type { CollatedInventory } from "@/types/collated";
import type { InventoryEdits } from "@/types/inventory-edits";
import type {
  InventoryTextApplyability,
  InventoryTextExtractionSuggestion,
  InventoryTextSuggestionKind,
} from "@/types/inventory-text-extraction";

function hasCompanyAndRole(suggestion: InventoryTextExtractionSuggestion): boolean {
  return Boolean(suggestion.company?.trim() && suggestion.role?.trim());
}

function mapsToKnownExperience(
  suggestion: InventoryTextExtractionSuggestion,
  collated: CollatedInventory,
  edits: InventoryEdits,
): boolean {
  if (suggestion.mappedExperienceKey) {
    const match = collated.experiences.find(
      (item) => experienceKey(item.company, item.role) === suggestion.mappedExperienceKey,
    );
    if (match) return true;
  }

  const company = suggestion.company?.trim();
  const role = suggestion.role?.trim();
  if (!company || !role) return false;

  return hasInventoryExperience(collated, edits, company, role);
}

export function classifyInventoryTextSuggestionApplyability(
  suggestion: InventoryTextExtractionSuggestion,
  collated: CollatedInventory,
  edits: InventoryEdits,
): InventoryTextApplyability {
  switch (suggestion.kind) {
    case "education":
      return "preview_only";
    case "keyword":
    case "skill":
    case "additional_experience":
      return "applyable";
    case "new_work_experience":
      if (!hasCompanyAndRole(suggestion)) {
        return "needs_manual_placement";
      }
      if (mapsToKnownExperience(suggestion, collated, edits)) {
        return "needs_manual_placement";
      }
      return "applyable";
    case "bullet_existing_experience":
      if (mapsToKnownExperience(suggestion, collated, edits)) {
        return "applyable";
      }
      if (hasCompanyAndRole(suggestion)) {
        return "applyable";
      }
      return "needs_manual_placement";
    case "bullet_new_experience":
      if (hasCompanyAndRole(suggestion)) {
        return "applyable";
      }
      return "needs_manual_placement";
    default:
      return "preview_only";
  }
}

export function applyabilityLabel(applyability: InventoryTextApplyability): string {
  switch (applyability) {
    case "applyable":
      return "Will be added";
    case "needs_manual_placement":
      return "Needs manual placement";
    case "preview_only":
      return "Preview only / unsupported";
  }
}

export function enrichInventoryTextSuggestions(
  suggestions: InventoryTextExtractionSuggestion[],
  collated: CollatedInventory,
  edits: InventoryEdits,
): InventoryTextExtractionSuggestion[] {
  return suggestions.map((suggestion) => {
    const applyability = classifyInventoryTextSuggestionApplyability(
      suggestion,
      collated,
      edits,
    );
    const warnings = [...suggestion.warnings];

    if (applyability === "needs_manual_placement") {
      if (suggestion.kind === "new_work_experience" && mapsToKnownExperience(suggestion, collated, edits)) {
        warnings.push("This company/role already exists in inventory — add bullets instead.");
      } else {
        warnings.push("Needs manual placement — add company and role before applying.");
      }
    }

    if (applyability === "preview_only" && suggestion.kind === "education") {
      warnings.push("Education overlay persistence is not supported yet.");
    }

    return {
      ...suggestion,
      applyability,
      warnings: [...new Set(warnings)],
    };
  });
}

export function isBulletSuggestionKind(
  kind: InventoryTextSuggestionKind,
): boolean {
  return kind === "bullet_existing_experience" || kind === "bullet_new_experience";
}
