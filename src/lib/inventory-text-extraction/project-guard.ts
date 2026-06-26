import { experienceKey } from "@/lib/inventory/normalize";
import type { InventoryAddedBullet, InventoryAddedExperience, InventoryEdits } from "@/types/inventory-edits";
import type { InventoryTextExtractionSuggestion } from "@/types/inventory-text-extraction";

const PROJECT_LABEL_EXACT = new Set([
  "project",
  "projects",
  "personal project",
  "personal projects",
  "side project",
  "side projects",
  "portfolio",
  "portfolio project",
  "portfolio projects",
  "github",
  "github project",
  "github projects",
  "app",
  "apps",
  "demo",
  "demos",
  "ai demo",
  "ai demos",
  "build project",
  "build projects",
]);

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isProjectLikeLabel(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = normalizeLabel(value);
  if (PROJECT_LABEL_EXACT.has(normalized)) return true;
  if (/^(personal |side |portfolio |github )?projects?$/.test(normalized)) return true;
  if (/^ai demos?$/.test(normalized)) return true;
  if (/^build projects?$/.test(normalized)) return true;
  return false;
}

export function looksLikeFreelanceClientEngagement(
  company: string | undefined,
  role: string | undefined,
  text: string,
): boolean {
  const companyValue = company?.trim() ?? "";
  const roleValue = role?.trim() ?? "";
  if (!companyValue || !roleValue) return false;
  if (isProjectLikeLabel(companyValue) || isProjectLikeLabel(roleValue)) return false;

  const combined = `${companyValue} ${roleValue} ${text}`;
  if (/\b(freelance|consulting|contract(or)?|client)\b/i.test(combined)) {
    return true;
  }

  if (
    /\b(intern(ship)?|analyst|associate|manager|lead|engineer|consultant|founder|director|advisor)\b/i.test(
      roleValue,
    ) &&
    !/\bproject(s)?\b/i.test(roleValue)
  ) {
    return true;
  }

  return false;
}

export function isProjectLikeTextImportSuggestion(
  suggestion: Pick<
    InventoryTextExtractionSuggestion,
    | "kind"
    | "company"
    | "role"
    | "text"
    | "keyword"
    | "warnings"
    | "sourceNote"
    | "matchLabel"
  >,
): boolean {
  if (suggestion.kind === "additional_experience") {
    return false;
  }

  const company = suggestion.company?.trim() ?? "";
  const role = suggestion.role?.trim() ?? "";
  const text = suggestion.text.trim();
  const keyword = suggestion.keyword?.trim() ?? "";
  const meta = [suggestion.sourceNote, ...suggestion.warnings].filter(Boolean).join(" ");

  if (looksLikeFreelanceClientEngagement(company, role, text)) {
    return false;
  }

  if (isProjectLikeLabel(company) || isProjectLikeLabel(role)) {
    return true;
  }

  if (/^projects?$/i.test(keyword)) {
    return true;
  }

  if (
    /\b(personal project|side project|portfolio project|github project|pet project|ai demo|built an app)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  if (/\bproject\b/i.test(meta) && (isProjectLikeLabel(company) || isProjectLikeLabel(role) || !company)) {
    return true;
  }

  if (
    (suggestion.kind === "new_work_experience" || suggestion.kind === "bullet_new_experience") &&
    !company &&
    !role &&
    /\bproject\b/i.test(text)
  ) {
    return true;
  }

  return false;
}

export function isProjectLikeOverlayExperience(
  company: string,
  role: string,
  descriptor?: string,
): boolean {
  if (isProjectLikeLabel(company) || isProjectLikeLabel(role)) {
    return true;
  }

  if (looksLikeFreelanceClientEngagement(company, role, descriptor ?? "")) {
    return false;
  }

  return /\b(personal project|side project|portfolio project|github project)\b/i.test(
    descriptor ?? "",
  );
}

export function resolveProjectNameFromSuggestion(
  suggestion: Pick<InventoryTextExtractionSuggestion, "company" | "role" | "text">,
): string {
  const company = suggestion.company?.trim() ?? "";
  const role = suggestion.role?.trim() ?? "";
  const text = suggestion.text.trim();

  if (role && !isProjectLikeLabel(role)) return role;
  if (company && !isProjectLikeLabel(company)) return company;

  const colonMatch = text.match(/^([^:]{3,72}):/);
  if (colonMatch) return colonMatch[1]!.trim();

  const dashMatch = text.match(/^(.{3,72})\s+[—–-]\s+/);
  if (dashMatch && !isProjectLikeLabel(dashMatch[1]!)) return dashMatch[1]!.trim();

  const firstSegment = text.split(/[.;]/)[0]?.trim();
  if (firstSegment && firstSegment.length >= 3 && !isProjectLikeLabel(firstSegment)) {
    return firstSegment.slice(0, 72);
  }

  return "Project";
}

export function resolveProjectDescriptionFromSuggestion(
  suggestion: Pick<InventoryTextExtractionSuggestion, "company" | "role" | "text">,
  projectName: string,
): string {
  const text = suggestion.text.trim();
  if (text.toLowerCase().startsWith(projectName.toLowerCase())) {
    const afterName = text.slice(projectName.length).replace(/^[\s:—–-]+/, "").trim();
    return afterName || text;
  }
  return text;
}

export function formatProjectAdditionalExperienceLine(
  projectName: string,
  description: string,
): string {
  const name = projectName.trim();
  const desc = description.trim();
  if (!name) return desc;
  if (!desc) return name;
  if (desc.toLowerCase().startsWith(name.toLowerCase())) return desc;
  return `${name}: ${desc}`;
}

export function combineProjectBulletDescriptions(
  projectName: string,
  parts: string[],
): string {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  if (cleaned.length === 0) return projectName;
  if (cleaned.length === 1) {
    return formatProjectAdditionalExperienceLine(projectName, cleaned[0]!);
  }

  const primary = cleaned[0]!;
  const secondary = cleaned[1]!;
  const combined =
    cleaned.length === 2
      ? `${primary}; ${secondary}`
      : `${primary}; ${secondary}; ${cleaned[2]!.trim()}`;

  return formatProjectAdditionalExperienceLine(projectName, combined.slice(0, 280));
}

export function coerceProjectLikeSuggestionToAdditional(
  suggestion: InventoryTextExtractionSuggestion,
): InventoryTextExtractionSuggestion {
  if (!isProjectLikeTextImportSuggestion(suggestion)) {
    return suggestion;
  }

  const projectName = resolveProjectNameFromSuggestion(suggestion);
  const description = resolveProjectDescriptionFromSuggestion(suggestion, projectName);
  const line = formatProjectAdditionalExperienceLine(projectName, description);

  return {
    ...suggestion,
    kind: "additional_experience",
    category: "additional_experience",
    matchLabel: "standalone",
    mappedExperienceKey: undefined,
    company: undefined,
    role: undefined,
    text: line,
    keyword: "Projects",
    applyability: "applyable",
    warnings: [
      ...new Set([
        ...suggestion.warnings,
        "Routed to Additional Experience — projects do not belong in Work Experience.",
      ]),
    ],
  };
}


function resolveProjectNameFromOverlay(experience: InventoryAddedExperience): string {
  return resolveProjectNameFromSuggestion({
    company: experience.company,
    role: experience.role,
    text: experience.descriptor ?? `${experience.role} at ${experience.company}`,
  });
}

export function resolveProjectNameFromOverlayExperience(
  experience: InventoryAddedExperience,
): string {
  return resolveProjectNameFromOverlay(experience);
}

export function listOverlayBulletsForExperience(
  edits: InventoryEdits,
  company: string,
  role: string,
): InventoryAddedBullet[] {
  const key = experienceKey(company, role);
  return edits.addedBulletsByExperienceKey?.[key] ?? [];
}
