import { experienceKey, normalizeBulletText } from "@/lib/inventory/normalize";

export function buildBulletEnrichmentKey(
  company: string,
  role: string,
  description: string,
): string {
  return `${experienceKey(company, role)}::${normalizeBulletText(description)}`;
}
