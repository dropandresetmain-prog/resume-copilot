import {
  extractJobMetadataFromText,
  mergeExtractedJobMetadata,
} from "@/lib/jd/extract-metadata";
import { findDuplicateJobDescription } from "@/lib/jd/persistence";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

export function normalizeJobDescriptionInput(input: JobDescriptionInput): JobDescriptionInput {
  const trimmedText = input.rawText.trim();
  const extracted = extractJobMetadataFromText(trimmedText);
  return mergeExtractedJobMetadata(
    {
      rawText: trimmedText,
      companyName: input.companyName?.trim() || undefined,
      roleTitle: input.roleTitle?.trim() || undefined,
      jobUrl: input.jobUrl?.trim() || undefined,
    },
    {
      companyName: input.companyName?.trim() ? undefined : extracted.companyName,
      roleTitle: input.roleTitle?.trim() ? undefined : extracted.roleTitle,
    },
  );
}

export type SaveJobForGenerationHandler = (
  input: JobDescriptionInput,
  editingId: string | null,
  options?: { allowDuplicate?: boolean },
) => Promise<StoredJobDescription>;

/**
 * Save or reuse a job description as part of generation.
 * Reuses an existing saved job when content matches (no duplicate rows).
 */
export async function ensureJobDescriptionForGeneration(
  input: JobDescriptionInput,
  options: {
    jobDescriptions: StoredJobDescription[];
    saveJob: SaveJobForGenerationHandler;
    editingId?: string | null;
  },
): Promise<StoredJobDescription> {
  const normalized = normalizeJobDescriptionInput(input);
  if (!normalized.rawText) {
    throw new Error("Job description text is required.");
  }

  if (options.editingId) {
    return options.saveJob(normalized, options.editingId);
  }

  const duplicate = findDuplicateJobDescription(options.jobDescriptions, normalized);
  if (duplicate) {
    return duplicate;
  }

  return options.saveJob(normalized, null);
}
