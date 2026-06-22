import {
  buildCoverLetterDocxFileName,
  buildCoverLetterPdfFileName,
  type ResumeExportFileNameInput,
} from "@/lib/resume-draft/export-filename";
import { resolveCompanyDisplayNameForProse } from "@/lib/cover-letter/company-name";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";
import type { StoredJobDescription } from "@/types/jd";

export function buildCoverLetterExportFileNameInput(options: {
  draft: GeneratedCoverLetterDraftRecord;
  resumeDraft?: Pick<GeneratedResumeDraftRecord, "content"> | null;
  job?: Pick<StoredJobDescription, "companyName" | "roleTitle"> | null;
}): ResumeExportFileNameInput {
  const fullName = options.resumeDraft?.content.header.fullName?.trim() || "Min Htet";
  const display = resolveCompanyDisplayNameForProse({
    rawName: options.draft.companyName ?? options.job?.companyName,
    website: options.draft.companyWebsite ?? options.draft.companyContext?.website,
    savedDisplayName: options.draft.companyContext?.displayName,
  }).companyDisplayName;

  return {
    fullName,
    companyName: display,
    roleTitle: options.job?.roleTitle ?? options.resumeDraft?.content.targetRoleTitle,
  };
}

export function resolveCoverLetterPdfFileName(options: {
  draft: GeneratedCoverLetterDraftRecord;
  resumeDraft?: Pick<GeneratedResumeDraftRecord, "content"> | null;
  job?: Pick<StoredJobDescription, "companyName" | "roleTitle"> | null;
}): string {
  return buildCoverLetterPdfFileName(buildCoverLetterExportFileNameInput(options));
}

export function resolveCoverLetterDocxFileName(options: {
  draft: GeneratedCoverLetterDraftRecord;
  resumeDraft?: Pick<GeneratedResumeDraftRecord, "content"> | null;
  job?: Pick<StoredJobDescription, "companyName" | "roleTitle"> | null;
}): string {
  return buildCoverLetterDocxFileName(buildCoverLetterExportFileNameInput(options));
}
