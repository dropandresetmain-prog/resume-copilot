import { experienceKey } from "@/lib/inventory/normalize";
import type {
  InventoryTextExtractionRequest,
  InventoryTextExtractionResult,
} from "@/types/inventory-text-extraction";

const MIN_PASTE_LENGTH = 24;

function createSuggestionId(): string {
  return crypto.randomUUID();
}

export function extractInventoryTextWithMock(
  input: InventoryTextExtractionRequest,
): InventoryTextExtractionResult {
  const pasted = input.pastedText.trim();
  if (pasted.length < MIN_PASTE_LENGTH) {
    return {
      sufficient: false,
      insufficientReason:
        "Not enough information in pasted text. Add role context, achievements, or skills.",
      warnings: [],
      suggestions: [],
      providerId: "mock",
    };
  }

  const warnings: string[] = [];
  const suggestions: InventoryTextExtractionResult["suggestions"] = [];
  const experienceByCompany = new Map(
    input.existingExperiences.map((item) => [
      item.company.toLowerCase(),
      item,
    ]),
  );

  const lines = pasted
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1]!.trim();
      const companyHint = input.existingExperiences[0];
      if (companyHint) {
        suggestions.push({
          id: createSuggestionId(),
          kind: "bullet_existing_experience",
          category: "bullets",
          text,
          company: companyHint.company,
          role: companyHint.role,
          matchLabel: "add_to_existing",
          mappedExperienceKey: companyHint.experienceKey,
          warnings: [],
          applyability: "applyable",
          sourceNote: "Parsed from bullet line in pasted text.",
        });
      } else {
        suggestions.push({
          id: createSuggestionId(),
          kind: "bullet_new_experience",
          category: "bullets",
          text,
          matchLabel: "new_experience",
          warnings: ["Add company and role in the pasted text to place this bullet."],
          applyability: "needs_manual_placement",
          sourceNote: "Parsed from bullet line without a matching experience.",
        });
      }
      continue;
    }

    const skillsMatch = line.match(/^skills?\s*:\s*(.+)$/i);
    if (skillsMatch) {
      for (const skill of skillsMatch[1]!.split(/[,;]/).map((item) => item.trim()).filter(Boolean)) {
        suggestions.push({
          id: createSuggestionId(),
          kind: "skill",
          category: "skills",
          text: skill,
          matchLabel: "standalone",
          warnings: [],
          applyability: "applyable",
        });
      }
      continue;
    }

    const keywordMatch = line.match(/^keywords?\s*:\s*(.+)$/i);
    if (keywordMatch) {
      for (const keyword of keywordMatch[1]!.split(/[,;]/).map((item) => item.trim()).filter(Boolean)) {
        suggestions.push({
          id: createSuggestionId(),
          kind: "keyword",
          category: "keywords",
          text: keyword,
          matchLabel: "standalone",
          warnings: [],
          applyability: "applyable",
        });
      }
      continue;
    }

    const roleAtCompany = line.match(/^(.+?)\s+at\s+(.+?)(?:\s*[-—|]\s*(.+))?$/i);
    if (roleAtCompany) {
      const role = roleAtCompany[1]!.trim();
      const company = roleAtCompany[2]!.trim();
      const dateRange = roleAtCompany[3]?.trim();
      const existing = experienceByCompany.get(company.toLowerCase());
      if (existing) {
        warnings.push(`Matched existing experience for ${company}.`);
      }
      suggestions.push({
        id: createSuggestionId(),
        kind: "new_work_experience",
        category: "work_experience",
        text: `${role} at ${company}${dateRange ? ` — ${dateRange}` : ""}`,
        company,
        role,
        dateRange,
        matchLabel: existing ? "add_to_existing" : "new_experience",
        mappedExperienceKey: existing?.experienceKey,
        warnings: existing
          ? ["Matches existing company/role — add bullets instead of a new experience row."]
          : [],
        applyability: existing ? "needs_manual_placement" : "applyable",
        sourceNote: "Parsed from role-at-company line.",
      });
    }
  }

  if (suggestions.length === 0 && pasted.length >= MIN_PASTE_LENGTH) {
    const fallbackCompany = input.existingExperiences[0];
    if (fallbackCompany) {
      suggestions.push({
        id: createSuggestionId(),
        kind: "bullet_existing_experience",
        category: "bullets",
        text: pasted.slice(0, 280),
        company: fallbackCompany.company,
        role: fallbackCompany.role,
        matchLabel: "add_to_existing",
        mappedExperienceKey: fallbackCompany.experienceKey,
        warnings: ["Treated entire paste as one bullet — review carefully."],
        applyability: "applyable",
      });
    } else {
      suggestions.push({
        id: createSuggestionId(),
        kind: "new_work_experience",
        category: "work_experience",
        text: pasted.slice(0, 280),
        matchLabel: "new_experience",
        warnings: ["Add company and role in the pasted text to create a new experience."],
        applyability: "needs_manual_placement",
      });
    }
  }

  return {
    sufficient: suggestions.length > 0,
    warnings,
    suggestions,
    providerId: "mock",
  };
}

export function mockMatchesExperienceKey(company: string, role: string): string {
  return experienceKey(company, role);
}
