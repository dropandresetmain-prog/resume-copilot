import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import type { SourceCitation } from "@/types/collated";
import type { CollatedInventory } from "@/types/collated";

export type EnrichmentBulletInput = {
  bulletKey: string;
  bulletId: string;
  company: string;
  role: string;
  keyword?: string;
  description: string;
  rawTexts: string[];
  sourceCitations: SourceCitation[];
};

export type EnrichmentInventoryInput = {
  bullets: EnrichmentBulletInput[];
};

export function buildEnrichmentInput(
  collated: CollatedInventory,
): EnrichmentInventoryInput {
  const bullets: EnrichmentBulletInput[] = [];

  for (const experience of collated.experiences) {
    for (const bullet of experience.bullets) {
      bullets.push({
        bulletKey: buildBulletEnrichmentKey(
          experience.company,
          experience.role,
          bullet.description,
        ),
        bulletId: bullet.id,
        company: experience.company,
        role: experience.role,
        keyword: bullet.keyword,
        description: bullet.description,
        rawTexts: bullet.rawTexts,
        sourceCitations: bullet.sourceCitations,
      });
    }
  }

  return { bullets };
}
