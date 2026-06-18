import {
  buildFinalResumeLayout,
  estimatePageFit,
  type FinalResumeLayout,
  type PageFitEstimate,
} from "@/lib/resume-draft/layout";
import { optimizeResumePreviewSettings } from "@/lib/resume-draft/preview-optimizer";
import {
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_MARGIN_DEFAULT_MM,
  PREVIEW_MARGIN_TOP_DEFAULT_MM,
  PREVIEW_SECTION_SPACING_DEFAULT,
  resolvePreviewFontSizes,
  type PreviewFontSizes,
} from "@/lib/resume-draft/preview-settings";
import { buildResumeDocxFileName } from "@/lib/resume-draft/export-filename";
import type { ResumeDraftContent } from "@/types/resume-draft";

/** Shared layout settings consumed by preview and export. */
export type ResumeLayoutSettings = {
  bodyFontPx: number;
  marginMm: number;
  marginTopMm: number;
  lineSpacing: number;
  sectionSpacing: number;
};

export type ResumeDocumentModel = {
  draftId: string;
  draftStatus: string;
  layout: FinalResumeLayout;
  layoutSettings: ResumeLayoutSettings;
  fontSizes: PreviewFontSizes;
  pageFit: PageFitEstimate;
  fontFamily: string;
  headerAlignment: "center" | "left";
  fileName: string;
  companyName?: string;
  roleTitle?: string;
};

export type BuildResumeDocumentModelInput = {
  draftId: string;
  draftStatus: string;
  content: ResumeDraftContent;
  layoutSettings?: Partial<ResumeLayoutSettings>;
  fontFamily?: string;
  headerAlignment?: "center" | "left";
  fullName?: string;
  companyName?: string;
  roleTitle?: string;
};

function resolveLayoutSettings(
  content: ResumeDraftContent,
  override?: Partial<ResumeLayoutSettings>,
): ResumeLayoutSettings {
  const optimized = optimizeResumePreviewSettings(content);
  return {
    bodyFontPx: override?.bodyFontPx ?? optimized.bodyFontPx,
    marginMm: override?.marginMm ?? optimized.marginMm,
    marginTopMm: override?.marginTopMm ?? optimized.marginTopMm,
    lineSpacing: override?.lineSpacing ?? optimized.lineSpacing,
    sectionSpacing: override?.sectionSpacing ?? optimized.sectionSpacing,
  };
}

/**
 * Canonical resume document model — single source for preview, DOCX, and future PDF.
 * Built from generated draft content + layout settings; does not mutate inventory.
 */
export function buildResumeDocumentModel(
  input: BuildResumeDocumentModelInput,
): ResumeDocumentModel {
  const layoutSettings = resolveLayoutSettings(input.content, input.layoutSettings);
  const layout = buildFinalResumeLayout(input.content);
  const pageFit = estimatePageFit(layout, layoutSettings);
  const fontSizes = resolvePreviewFontSizes(layoutSettings.bodyFontPx);
  const fullName = input.fullName?.trim() || input.content.header.fullName?.trim() || "Candidate";

  return {
    draftId: input.draftId,
    draftStatus: input.draftStatus,
    layout,
    layoutSettings,
    fontSizes,
    pageFit,
    fontFamily: input.fontFamily ?? DEFAULT_RESUME_FONT_FAMILY,
    headerAlignment: input.headerAlignment ?? "center",
    fileName: buildResumeDocxFileName({
      fullName,
      companyName: input.companyName,
      roleTitle: input.roleTitle,
    }),
    companyName: input.companyName,
    roleTitle: input.roleTitle,
  };
}

export const DEFAULT_RESUME_LAYOUT_SETTINGS: ResumeLayoutSettings = {
  bodyFontPx: PREVIEW_BODY_FONT_DEFAULT_PX,
  marginMm: PREVIEW_MARGIN_DEFAULT_MM,
  marginTopMm: PREVIEW_MARGIN_TOP_DEFAULT_MM,
  lineSpacing: PREVIEW_LINE_SPACING_DEFAULT,
  sectionSpacing: PREVIEW_SECTION_SPACING_DEFAULT,
};
