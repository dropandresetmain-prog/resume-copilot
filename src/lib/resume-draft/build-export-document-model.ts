import {
  buildResumeDocumentModel,
  type ResumeDocumentModel,
  type ResumeLayoutSettings,
} from "@/lib/resume-draft/document-model";
import { buildReferenceResumeFormatProfile } from "@/lib/resume-draft/reference-format";
import { DEFAULT_RESUME_FONT_FAMILY } from "@/lib/resume-draft/preview-settings";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";
import type { ParsedResume } from "@/types/resume";

export type ExportTypography = {
  fontFamily: string;
  headerAlignment: "center" | "left";
};

export type BuildExportResumeDocumentModelInput = {
  draft: Pick<GeneratedResumeDraftRecord, "id" | "status" | "content" | "referenceResumeId">;
  jobDescription?: Pick<StoredJobDescription, "companyName" | "roleTitle"> | null;
  referenceResume?: ParsedResume | null;
  layoutSettings?: Partial<ResumeLayoutSettings>;
};

/** Resolve print typography from reference resume (format-only; never content). */
export function resolveExportTypographyFromReference(
  referenceResume?: ParsedResume | null,
): ExportTypography {
  if (!referenceResume) {
    return {
      fontFamily: DEFAULT_RESUME_FONT_FAMILY,
      headerAlignment: "center",
    };
  }

  const profile = buildReferenceResumeFormatProfile(referenceResume);
  return {
    fontFamily: profile.fontFamily ?? DEFAULT_RESUME_FONT_FAMILY,
    headerAlignment: profile.headerAlignment ?? "center",
  };
}

export function findReferenceResumeInInventory(
  inventoryResumes: readonly ParsedResume[],
  referenceResumeId?: string,
): ParsedResume | null {
  if (!referenceResumeId) {
    return null;
  }
  return inventoryResumes.find((resume) => resume.id === referenceResumeId) ?? null;
}

/**
 * Shared builder for preview page and export API routes.
 * Keeps fontFamily/headerAlignment/job metadata aligned with PDF Preview.
 */
export function buildExportResumeDocumentModel(
  input: BuildExportResumeDocumentModelInput,
): ResumeDocumentModel {
  const { fontFamily, headerAlignment } = resolveExportTypographyFromReference(
    input.referenceResume,
  );

  return buildResumeDocumentModel({
    draftId: input.draft.id,
    draftStatus: input.draft.status,
    content: input.draft.content,
    layoutSettings: input.layoutSettings,
    fontFamily,
    headerAlignment,
    fullName: input.draft.content.header.fullName,
    companyName: input.jobDescription?.companyName,
    roleTitle: input.jobDescription?.roleTitle ?? input.draft.content.targetRoleTitle,
  });
}
