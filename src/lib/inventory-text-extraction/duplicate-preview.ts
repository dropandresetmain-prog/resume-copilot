import { applyInventoryEditsToCollated, buildCollatedBulletKey } from "@/lib/inventory/edits";
import { bulletsAreSimilar, experienceKey } from "@/lib/inventory/normalize";
import type { CollatedInventory } from "@/types/collated";
import type { InventoryEdits } from "@/types/inventory-edits";
import type { InventoryTextExtractionSuggestion } from "@/types/inventory-text-extraction";

export function flagDuplicateInventoryTextSuggestions(
  suggestions: InventoryTextExtractionSuggestion[],
  collated: CollatedInventory,
  edits?: InventoryEdits,
): InventoryTextExtractionSuggestion[] {
  const activeCollated = edits
    ? applyInventoryEditsToCollated(collated, edits)
    : collated;

  return suggestions.map((suggestion) => {
    if (
      suggestion.kind !== "bullet_existing_experience" &&
      suggestion.kind !== "bullet_new_experience"
    ) {
      return suggestion;
    }

    const company = suggestion.company?.trim();
    const role = suggestion.role?.trim();
    if (!company || !role) return suggestion;

    const experience = activeCollated.experiences.find(
      (item) => experienceKey(item.company, item.role) === experienceKey(company, role),
    );
    if (!experience) return suggestion;

    for (const bullet of experience.bullets) {
      const bulletKey =
        bullet.inventoryBulletKey ?? buildCollatedBulletKey(experience, bullet);
      if (bulletsAreSimilar(bullet.description, suggestion.text)) {
        return {
          ...suggestion,
          duplicateOfBulletKey: bulletKey,
          duplicateReason: "Similar to an existing inventory bullet in this role.",
          warnings: [
            ...new Set([
              ...suggestion.warnings,
              "May duplicate existing inventory — review before applying.",
            ]),
          ],
        };
      }
    }

    return suggestion;
  });
}
