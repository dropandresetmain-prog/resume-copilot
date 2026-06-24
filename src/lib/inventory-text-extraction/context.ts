import { experienceKey } from "@/lib/inventory/normalize";
import type { CollatedInventory } from "@/types/collated";
import type { InventoryTextExtractionRequest } from "@/types/inventory-text-extraction";

export function buildInventoryTextExtractionRequest(
  pastedText: string,
  collated: CollatedInventory,
): InventoryTextExtractionRequest {
  return {
    pastedText,
    existingExperiences: collated.experiences.map((experience) => ({
      company: experience.company,
      role: experience.role,
      experienceKey: experienceKey(experience.company, experience.role),
    })),
  };
}
