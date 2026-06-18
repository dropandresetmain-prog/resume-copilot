import { calculateExperienceDuration } from "@/lib/date/duration";
import { createEmptyEnrichmentState, migrateEnrichmentSuggestions } from "@/lib/enrichment/state";
import { validateStoredJobDescription } from "@/lib/jd/persistence";
import type {
  DuplicateGroupSuggestion,
  EnrichmentRunMetadata,
  EnrichmentState,
  EnrichmentTestBatch,
} from "@/types/enrichment";
import type { StoredJobDescription } from "@/types/jd";
import type {
  ExportedInventory,
  InventoryState,
  ParsedEducationItem,
  ParsedExperience,
  ParsedResume,
  PersistedInventory,
} from "@/types/resume";
import { INVENTORY_SCHEMA_VERSION } from "@/types/resume";

export const INVENTORY_STORAGE_KEY = "career-resume-copilot:v1:inventory";

function enrichExperience(experience: ParsedExperience): ParsedExperience {
  return {
    ...experience,
    experienceDuration: calculateExperienceDuration(experience.dateRange),
  };
}

function migrateEducationBullets(bullets: unknown): string[] {
  if (!Array.isArray(bullets)) return [];

  return bullets
    .map((bullet) => {
      if (typeof bullet === "string") return bullet;
      if (
        typeof bullet === "object" &&
        bullet !== null &&
        "description" in bullet &&
        typeof bullet.description === "string"
      ) {
        return bullet.description;
      }
      if (
        typeof bullet === "object" &&
        bullet !== null &&
        "rawBulletText" in bullet &&
        typeof bullet.rawBulletText === "string"
      ) {
        return bullet.rawBulletText;
      }
      return "";
    })
    .filter(Boolean);
}

function migrateEducationItem(item: unknown): ParsedEducationItem | null {
  if (!isObject(item)) return null;
  if (typeof item.id !== "string") return null;
  if (typeof item.sourceResumeId !== "string") return null;
  if (typeof item.institution !== "string") return null;
  if (typeof item.rawText !== "string") return null;

  const programmes = Array.isArray(item.programmes)
    ? item.programmes.filter((entry): entry is string => typeof entry === "string")
    : typeof item.programme === "string" && item.programme.trim()
      ? [item.programme]
      : [];

  const bullets = migrateEducationBullets(item.bullets);
  const dateRange =
    typeof item.dateRange === "string" && item.dateRange.trim()
      ? item.dateRange
      : undefined;

  return {
    id: item.id,
    sourceResumeId: item.sourceResumeId,
    institution: item.institution,
    location:
      typeof item.location === "string" && item.location.trim()
        ? item.location
        : undefined,
    programmes,
    dateRange,
    experienceDuration: dateRange
      ? calculateExperienceDuration(dateRange)
      : undefined,
    bullets,
    rawText: item.rawText,
    parseWarnings: Array.isArray(item.parseWarnings)
      ? item.parseWarnings.filter((warning): warning is string => typeof warning === "string")
      : [],
  };
}

function enrichResume(resume: ParsedResume): ParsedResume {
  return {
    ...resume,
    workExperiences: resume.workExperiences.map(enrichExperience),
    education: resume.education.map((item) => ({
      ...item,
      experienceDuration: item.dateRange
        ? calculateExperienceDuration(item.dateRange)
        : item.experienceDuration,
    })),
  };
}

export function enrichInventory(inventory: InventoryState): InventoryState {
  return {
    ...inventory,
    resumes: inventory.resumes.map(enrichResume),
    enrichment: inventory.enrichment ?? createEmptyEnrichmentState(),
  };
}

export function serializeInventory(inventory: InventoryState): string {
  const payload: PersistedInventory = {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    inventory,
  };
  return JSON.stringify(payload);
}

export function parsePersistedInventory(raw: string): {
  inventory: InventoryState | null;
  warning: string | null;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = validateInventoryPayload(parsed);
    if (!validated) {
      return {
        inventory: null,
        warning:
          "Stored inventory data is invalid or from an unsupported version. It was ignored.",
      };
    }
    return { inventory: enrichInventory(validated), warning: null };
  } catch {
    return {
      inventory: null,
      warning: "Stored inventory data could not be parsed. It was ignored.",
    };
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isParsedBullet(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.parentId === "string" &&
    typeof value.keyword === "string" &&
    typeof value.description === "string" &&
    typeof value.rawBulletText === "string"
  );
}

function isParsedExperience(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.sourceResumeId === "string" &&
    typeof value.company === "string" &&
    typeof value.role === "string" &&
    typeof value.dateRange === "string" &&
    Array.isArray(value.bullets) &&
    value.bullets.every(isParsedBullet)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isParsedTextSection(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.sourceResumeId === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.lines) &&
    value.lines.every((line) => typeof line === "string") &&
    typeof value.rawText === "string"
  );
}

function isParsedUnparsedSection(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.sourceResumeId === "string" &&
    typeof value.title === "string" &&
    typeof value.originalHeader === "string" &&
    Array.isArray(value.lines) &&
    value.lines.every((line) => typeof line === "string") &&
    typeof value.rawText === "string" &&
    isStringArray(value.parseWarnings)
  );
}

function migrateTextSection(value: unknown): ParsedResume["additionalExperience"] {
  if (!isParsedTextSection(value)) {
    throw new Error("Invalid text section");
  }

  const section = value as ParsedResume["additionalExperience"];
  return {
    ...section,
    parseWarnings: isStringArray(section.parseWarnings) ? section.parseWarnings : [],
  };
}

function migrateSkillsSection(value: unknown): ParsedResume["skills"] {
  if (!isObject(value) || typeof value.id !== "string") {
    throw new Error("Invalid skills section");
  }

  return {
    id: value.id,
    sourceResumeId: typeof value.sourceResumeId === "string" ? value.sourceResumeId : "",
    languages: Array.isArray(value.languages)
      ? value.languages.filter((item): item is string => typeof item === "string")
      : [],
    technicalSkills: Array.isArray(value.technicalSkills)
      ? value.technicalSkills.filter((item): item is string => typeof item === "string")
      : [],
    interests: Array.isArray(value.interests)
      ? value.interests.filter((item): item is string => typeof item === "string")
      : [],
    other: Array.isArray(value.other)
      ? value.other.filter((item): item is string => typeof item === "string")
      : [],
    rawText: typeof value.rawText === "string" ? value.rawText : "",
    parseWarnings: isStringArray(value.parseWarnings) ? value.parseWarnings : [],
  };
}

function migrateUnparsedSections(value: unknown): ParsedResume["unparsedSections"] {
  if (!Array.isArray(value)) return [];
  return value.filter(isParsedUnparsedSection) as ParsedResume["unparsedSections"];
}
function isParsedEducationItem(value: unknown): boolean {
  const migrated = migrateEducationItem(value);
  return migrated !== null;
}

function migrateRunMetadata(value: unknown): EnrichmentRunMetadata | undefined {
  if (!isObject(value)) return undefined;
  const provider = value.provider;
  if (provider !== "mock" && provider !== "gemini" && provider !== "openai") {
    return undefined;
  }
  return {
    provider,
    isMock: typeof value.isMock === "boolean" ? value.isMock : provider === "mock",
    providerLabel:
      typeof value.providerLabel === "string" ? value.providerLabel : "Enrichment",
    modelName: typeof value.modelName === "string" ? value.modelName : undefined,
    batchMode:
      value.batchMode === "small_batch_test" ? "small_batch_test" : "full",
    bulletsSent: typeof value.bulletsSent === "number" ? value.bulletsSent : 0,
    suggestionsReturned:
      typeof value.suggestionsReturned === "number" ? value.suggestionsReturned : 0,
    timestamp:
      typeof value.timestamp === "string"
        ? value.timestamp
        : new Date().toISOString(),
  };
}

function migrateTestBatch(value: unknown): EnrichmentTestBatch | undefined {
  if (!isObject(value)) return undefined;
  const runMetadata = migrateRunMetadata(value.runMetadata);
  if (!runMetadata) return undefined;

  return {
    suggestions: migrateEnrichmentSuggestions(value.suggestions),
    duplicateGroups: Array.isArray(value.duplicateGroups)
      ? (value.duplicateGroups as DuplicateGroupSuggestion[])
      : [],
    runMetadata,
  };
}

function migrateEnrichmentState(value: unknown): EnrichmentState {
  if (!isObject(value)) {
    return createEmptyEnrichmentState();
  }

  return {
    suggestions: migrateEnrichmentSuggestions(value.suggestions),
    duplicateGroups: Array.isArray(value.duplicateGroups)
      ? (value.duplicateGroups as EnrichmentState["duplicateGroups"])
      : [],
    keywordBank: Array.isArray(value.keywordBank)
      ? (value.keywordBank as EnrichmentState["keywordBank"])
      : [],
    lastEnrichedAt:
      typeof value.lastEnrichedAt === "string" ? value.lastEnrichedAt : undefined,
    providerId:
      value.providerId === "mock" ||
      value.providerId === "gemini" ||
      value.providerId === "openai"
        ? value.providerId
        : undefined,
    isMockProvider:
      typeof value.isMockProvider === "boolean" ? value.isMockProvider : value.providerId === "mock",
    providerLabel:
      typeof value.providerLabel === "string" ? value.providerLabel : undefined,
    lastRunMetadata: migrateRunMetadata(value.lastRunMetadata),
    testBatch: migrateTestBatch(value.testBatch),
  };
}

function isParsedResume(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.filename !== "string") return false;
  if (typeof value.uploadedAt !== "string") return false;
  if (!Array.isArray(value.workExperiences)) return false;
  if (!value.workExperiences.every(isParsedExperience)) return false;
  if (!Array.isArray(value.education)) return false;
  if (!value.education.every(isParsedEducationItem)) return false;
  if (!isParsedTextSection(value.additionalExperience)) return false;
  if (!isObject(value.skills)) return false;
  if (typeof value.skills.id !== "string") return false;
  if (
    "unparsedSections" in value &&
    (!Array.isArray(value.unparsedSections) ||
      !value.unparsedSections.every(isParsedUnparsedSection))
  ) {
    return false;
  }
  if (!Array.isArray(value.parseWarnings)) return false;
  return value.parseWarnings.every((item) => typeof item === "string");
}

function normalizeResume(value: unknown): ParsedResume | null {
  if (!isObject(value)) return null;
  if (!isParsedResume(value)) return null;

  const education = (value.education as unknown[])
    .map((item) => migrateEducationItem(item))
    .filter((item): item is ParsedEducationItem => item !== null);

  return enrichResume({
    ...(value as ParsedResume),
    education,
    additionalExperience: migrateTextSection(value.additionalExperience),
    skills: migrateSkillsSection(value.skills),
    unparsedSections: migrateUnparsedSections(value.unparsedSections),
  });
}

export function validateInventoryState(value: unknown): InventoryState | null {
  if (!isObject(value)) return null;
  if (!Array.isArray(value.resumes)) return null;
  if (!value.resumes.every(isParsedResume)) return null;
  if (!Array.isArray(value.failures)) return null;
  if (
    !value.failures.every(
      (failure) =>
        isObject(failure) &&
        typeof failure.filename === "string" &&
        typeof failure.message === "string",
    )
  ) {
    return null;
  }

  return {
    resumes: value.resumes
      .map((resume) => normalizeResume(resume))
      .filter((resume): resume is ParsedResume => resume !== null),
    failures: value.failures as InventoryState["failures"],
    enrichment: migrateEnrichmentState(value.enrichment),
  };
}

function validateSchemaVersion(value: unknown): number | null {
  if (!isObject(value)) return null;
  if (typeof value.schemaVersion !== "number") return null;
  if (![1, 2, INVENTORY_SCHEMA_VERSION].includes(value.schemaVersion)) {
    return null;
  }
  return value.schemaVersion;
}

function parseExportJobDescriptions(value: unknown): {
  jobDescriptions: StoredJobDescription[];
  warning: string | null;
} {
  if (!isObject(value) || !("jobDescriptions" in value)) {
    return { jobDescriptions: [], warning: null };
  }

  const source = value.jobDescriptions;
  if (!Array.isArray(source)) {
    return {
      jobDescriptions: [],
      warning: "Imported job descriptions were malformed and were skipped.",
    };
  }

  const jobDescriptions = source
    .map((item) => validateStoredJobDescription(item))
    .filter((item): item is StoredJobDescription => item !== null);

  if (source.length > 0 && jobDescriptions.length === 0) {
    return {
      jobDescriptions: [],
      warning: "Imported job descriptions could not be validated and were skipped.",
    };
  }

  if (jobDescriptions.length < source.length) {
    return {
      jobDescriptions,
      warning: "Some imported job descriptions were invalid and were skipped.",
    };
  }

  return { jobDescriptions, warning: null };
}

export function validateInventoryPayload(
  value: unknown,
): InventoryState | null {
  if (!isObject(value)) return null;

  const schemaVersion = validateSchemaVersion(value);
  if (schemaVersion === null) {
    return null;
  }

  if ("inventory" in value) {
    return validateInventoryState(value.inventory);
  }

  return validateInventoryState(value);
}

export function createExportPayload(
  inventory: InventoryState,
  jobDescriptions: StoredJobDescription[] = [],
): ExportedInventory {
  // JSON export is legacy backup only. Supabase is source-of-truth.
  // TODO(Milestone 4+): optional export bundle could include Supabase Storage blobs.
  return {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    inventory,
    jobDescriptions,
  };
}

export function parseImportedInventory(raw: string): {
  inventory: InventoryState | null;
  jobDescriptions: StoredJobDescription[];
  error: string | null;
  warning: string | null;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = validateInventoryPayload(parsed);
    if (!validated) {
      return {
        inventory: null,
        jobDescriptions: [],
        error: "Import file is not a valid inventory JSON export.",
        warning: null,
      };
    }
    const { jobDescriptions, warning } = parseExportJobDescriptions(parsed);
    return {
      inventory: enrichInventory(validated),
      jobDescriptions,
      error: null,
      warning,
    };
  } catch {
    return {
      inventory: null,
      jobDescriptions: [],
      error: "Import file could not be parsed as JSON.",
      warning: null,
    };
  }
}

export function downloadInventoryJson(
  inventory: InventoryState,
  jobDescriptions: StoredJobDescription[] = [],
): void {
  const payload = createExportPayload(inventory, jobDescriptions);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = payload.exportedAt.replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `resume-inventory-${timestamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
