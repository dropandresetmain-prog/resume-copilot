import type {
  JobDescriptionInput,
  PersistedJobDescriptions,
  StoredJobDescription,
} from "@/types/jd";
import { JD_STORAGE_SCHEMA_VERSION } from "@/types/jd";

export const JD_STORAGE_KEY = "resumeCopilot.jobDescriptions.v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateStoredJobDescription(
  value: unknown,
): StoredJobDescription | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.rawText !== "string" || !value.rawText.trim()) return null;
  if (typeof value.createdAt !== "string") return null;
  if (typeof value.updatedAt !== "string") return null;

  return {
    id: value.id,
    rawText: value.rawText.trim(),
    companyName:
      typeof value.companyName === "string" && value.companyName.trim()
        ? value.companyName.trim()
        : undefined,
    roleTitle:
      typeof value.roleTitle === "string" && value.roleTitle.trim()
        ? value.roleTitle.trim()
        : undefined,
    jobUrl:
      typeof value.jobUrl === "string" && value.jobUrl.trim()
        ? value.jobUrl.trim()
        : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function validateStoredJobDescriptions(value: unknown): StoredJobDescription[] {
  if (!isObject(value)) return [];

  const items = Array.isArray(value.jobDescriptions)
    ? value.jobDescriptions
    : Array.isArray(value)
      ? value
      : [];

  return items
    .map((item) => validateStoredJobDescription(item))
    .filter((item): item is StoredJobDescription => item !== null);
}

export function serializeJobDescriptions(
  jobDescriptions: StoredJobDescription[],
): string {
  const payload: PersistedJobDescriptions = {
    schemaVersion: JD_STORAGE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    jobDescriptions,
  };
  return JSON.stringify(payload);
}

export function parseStoredJobDescriptions(raw: string): {
  jobDescriptions: StoredJobDescription[];
  warning: string | null;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) && !Array.isArray(parsed)) {
      return {
        jobDescriptions: [],
        warning: "Stored job descriptions could not be validated. They were ignored.",
      };
    }

    const source = isObject(parsed) && Array.isArray(parsed.jobDescriptions)
      ? parsed.jobDescriptions
      : Array.isArray(parsed)
        ? parsed
        : [];

    const jobDescriptions = source
      .map((item) => validateStoredJobDescription(item))
      .filter((item): item is StoredJobDescription => item !== null);

    if (source.length > 0 && jobDescriptions.length === 0) {
      return {
        jobDescriptions: [],
        warning: "Stored job descriptions could not be validated. They were ignored.",
      };
    }

    return { jobDescriptions, warning: null };
  } catch {
    return {
      jobDescriptions: [],
      warning: "Stored job descriptions could not be parsed. They were ignored.",
    };
  }
}

export function createJobDescriptionFromInput(
  input: JobDescriptionInput,
): StoredJobDescription {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    rawText: input.rawText.trim(),
    companyName: input.companyName?.trim() || undefined,
    roleTitle: input.roleTitle?.trim() || undefined,
    jobUrl: input.jobUrl?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function storedJobDescriptionFromInput(
  input: JobDescriptionInput,
  existing?: StoredJobDescription,
): StoredJobDescription {
  if (!existing) {
    return createJobDescriptionFromInput(input);
  }

  return {
    ...existing,
    rawText: input.rawText.trim(),
    companyName: input.companyName?.trim() || undefined,
    roleTitle: input.roleTitle?.trim() || undefined,
    jobUrl: input.jobUrl?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function upsertJobDescriptionInList(
  jobDescriptions: StoredJobDescription[],
  jobDescription: StoredJobDescription,
): StoredJobDescription[] {
  const index = jobDescriptions.findIndex((item) => item.id === jobDescription.id);
  if (index < 0) {
    return [...jobDescriptions, jobDescription];
  }
  return jobDescriptions.map((item, itemIndex) =>
    itemIndex === index ? jobDescription : item,
  );
}

export function deleteJobDescriptionFromList(
  jobDescriptions: StoredJobDescription[],
  id: string,
): StoredJobDescription[] {
  return jobDescriptions.filter((item) => item.id !== id);
}

export function clearJobDescriptionsInList(): StoredJobDescription[] {
  return [];
}

export function normalizeJobDescriptionField(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeJobDescriptionRawText(rawText: string): string {
  return rawText.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findDuplicateJobDescription(
  jobDescriptions: StoredJobDescription[],
  candidate: JobDescriptionInput | StoredJobDescription,
  excludeId?: string,
): StoredJobDescription | undefined {
  const rawText = normalizeJobDescriptionRawText(candidate.rawText);
  const companyName = normalizeJobDescriptionField(candidate.companyName);
  const roleTitle = normalizeJobDescriptionField(candidate.roleTitle);

  return jobDescriptions.find((item) => {
    if (excludeId && item.id === excludeId) return false;
    return (
      normalizeJobDescriptionRawText(item.rawText) === rawText &&
      normalizeJobDescriptionField(item.companyName) === companyName &&
      normalizeJobDescriptionField(item.roleTitle) === roleTitle
    );
  });
}
