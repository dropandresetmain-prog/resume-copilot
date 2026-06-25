import { extractJsonCandidate } from "@/lib/ai/parse-enrichment-response";
import type {
  InventoryTextApplyability,
  InventoryTextExtractionResult,
  InventoryTextExtractionSuggestion,
  InventoryTextMatchLabel,
  InventoryTextSuggestionCategory,
  InventoryTextSuggestionKind,
} from "@/types/inventory-text-extraction";
import type { AIProviderId } from "@/types/enrichment";

export class InventoryTextExtractionParseError extends Error {
  readonly rawModelResponse: string;

  constructor(message: string, rawModelResponse: string) {
    super(message);
    this.name = "InventoryTextExtractionParseError";
    this.rawModelResponse = rawModelResponse;
  }
}

const VALID_KINDS = new Set<InventoryTextSuggestionKind>([
  "new_work_experience",
  "bullet_existing_experience",
  "bullet_new_experience",
  "skill",
  "education",
  "additional_experience",
  "keyword",
]);

const VALID_MATCH_LABELS = new Set<InventoryTextMatchLabel>([
  "add_to_existing",
  "new_experience",
  "standalone",
]);

function categoryForKind(kind: InventoryTextSuggestionKind): InventoryTextSuggestionCategory {
  switch (kind) {
    case "new_work_experience":
      return "work_experience";
    case "bullet_existing_experience":
    case "bullet_new_experience":
      return "bullets";
    case "skill":
      return "skills";
    case "education":
      return "education";
    case "additional_experience":
      return "additional_experience";
    case "keyword":
      return "keywords";
  }
}

function applyabilityForKind(
  kind: InventoryTextSuggestionKind,
  suggestion: {
    company?: string;
    role?: string;
  },
): InventoryTextApplyability {
  if (kind === "education") {
    return "preview_only";
  }
  if (
    (kind === "new_work_experience" ||
      kind === "bullet_existing_experience" ||
      kind === "bullet_new_experience") &&
    (!suggestion.company?.trim() || !suggestion.role?.trim())
  ) {
    return "needs_manual_placement";
  }
  return "applyable";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function normalizeKind(value: unknown): InventoryTextSuggestionKind | null {
  if (typeof value !== "string") return null;
  return VALID_KINDS.has(value as InventoryTextSuggestionKind)
    ? (value as InventoryTextSuggestionKind)
    : null;
}

function normalizeMatchLabel(value: unknown): InventoryTextMatchLabel {
  if (typeof value === "string" && VALID_MATCH_LABELS.has(value as InventoryTextMatchLabel)) {
    return value as InventoryTextMatchLabel;
  }
  return "standalone";
}

function createSuggestionId(): string {
  return crypto.randomUUID();
}

function normalizeSuggestion(raw: unknown): InventoryTextExtractionSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const kind = normalizeKind(value.kind);
  const text = asString(value.text);
  if (!kind || !text) return null;

  return {
    id: createSuggestionId(),
    kind,
    category: categoryForKind(kind),
    text,
    company: asString(value.company),
    role: asString(value.role),
    keyword: asString(value.keyword),
    institution: asString(value.institution),
    dateRange: asString(value.dateRange),
    matchLabel: normalizeMatchLabel(value.matchLabel),
    mappedExperienceKey: asString(value.mappedExperienceKey),
    warnings: asStringArray(value.warnings),
    applyability: applyabilityForKind(kind, {
      company: asString(value.company),
      role: asString(value.role),
    }),
    sourceNote: asString(value.sourceNote),
  };
}

export function parseInventoryTextExtractionJson(
  text: string,
  providerId: AIProviderId,
): InventoryTextExtractionResult {
  try {
    const candidate = extractJsonCandidate(text);
    const parsed: unknown = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object") {
      throw new InventoryTextExtractionParseError(
        "Model response was not a JSON object.",
        text,
      );
    }

    const value = parsed as Record<string, unknown>;
    const sufficient = value.sufficient !== false;
    const insufficientReason = asString(value.insufficientReason);
    const warnings = asStringArray(value.warnings);
    const suggestions = Array.isArray(value.suggestions)
      ? value.suggestions
          .map((item) => normalizeSuggestion(item))
          .filter((item): item is InventoryTextExtractionSuggestion => item !== null)
      : [];

    if (!sufficient) {
      return {
        sufficient: false,
        insufficientReason:
          insufficientReason ?? "Not enough information in pasted text to extract suggestions.",
        warnings,
        suggestions: [],
        providerId,
      };
    }

    return {
      sufficient: suggestions.length > 0,
      insufficientReason:
        suggestions.length === 0
          ? insufficientReason ?? "No structured suggestions could be extracted."
          : undefined,
      warnings,
      suggestions,
      providerId,
    };
  } catch (error) {
    if (error instanceof InventoryTextExtractionParseError) {
      throw error;
    }
    throw new InventoryTextExtractionParseError(
      error instanceof Error ? error.message : "Invalid JSON from model.",
      text,
    );
  }
}

export function emptyExtractionResult(providerId: AIProviderId): InventoryTextExtractionResult {
  return {
    sufficient: false,
    insufficientReason: "No pasted text provided.",
    warnings: [],
    suggestions: [],
    providerId,
  };
}
