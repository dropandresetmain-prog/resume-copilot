import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResumeDocumentModel, ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import { generateResumePdfResult, type ResumePdfGenerationResult } from "@/lib/resume-draft/pdf-export";
import {
  buildOnePagePdfValidation,
  type ResumePdfOnePageValidation,
} from "@/lib/resume-draft/pdf-export-validation";
import {
  ExportRequestError,
  resolveExportDocumentModelForDraft,
} from "@/lib/resume-draft/resolve-export-request";

export type ValidateResumePdfExportInput = {
  supabase: SupabaseClient;
  userId: string;
  draftId: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
};

export type ValidateResumePdfExportOutput = {
  draft: Awaited<ReturnType<typeof resolveExportDocumentModelForDraft>>["draft"];
  documentModel: ResumeDocumentModel;
  generation: ResumePdfGenerationResult;
  validation: ResumePdfOnePageValidation;
};

/** Generate server PDF and validate one-page requirement (export truth). */
export async function validateResumePdfExport(
  input: ValidateResumePdfExportInput,
): Promise<ValidateResumePdfExportOutput> {
  const { draft, documentModel } = await resolveExportDocumentModelForDraft(
    input.supabase,
    input.userId,
    input.draftId,
    input.layoutSettings,
  );

  const generation = await generateResumePdfResult(documentModel);
  const validation = buildOnePagePdfValidation(generation.pageCount);

  return {
    draft,
    documentModel,
    generation,
    validation,
  };
}

export { ExportRequestError };
