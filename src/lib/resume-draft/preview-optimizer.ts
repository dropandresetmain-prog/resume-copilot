import { buildFinalResumeLayout, estimatePageFit } from "@/lib/resume-draft/layout";
import {
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_BODY_FONT_STEP_PX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";
import type { ResumeDraftContent } from "@/types/resume-draft";

export type OptimizedPreviewSettings = {
  bodyFontPx: number;
  marginMm: number;
  marginTopMm: number;
  lineSpacing: number;
  sectionSpacing: number;
  estimatedPages: number;
  overflowLines: number;
  exceedsOnePage: boolean;
  autoOptimized: boolean;
  optimizationNote?: string;
  warning?: string;
};

const BODY_FONT_STEPS = [11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7];
const MARGIN_STEPS = [12, 10, 9, 8];
const LINE_SPACING_STEPS = [1.05, 1, 0.98, PREVIEW_LINE_SPACING_MIN];
const SECTION_SPACING_STEPS = [0.6, 0.5, 0.45, 0.35];

function snapBodyFontPx(value: number): number {
  const steps = Math.round((value - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX);
  return PREVIEW_BODY_FONT_MIN_PX + steps * PREVIEW_BODY_FONT_STEP_PX;
}

/**
 * Deterministically choose preview settings that best fit one A4 page.
 * Starts at 11px body font, tightens spacing/margins, then reduces font if needed.
 */
export function optimizeResumePreviewSettings(
  content: ResumeDraftContent,
): OptimizedPreviewSettings {
  const layout = buildFinalResumeLayout(content);

  let bestOverflow: OptimizedPreviewSettings | null = null;

  for (const bodyFontPx of BODY_FONT_STEPS) {
    for (const marginMm of MARGIN_STEPS) {
      for (const lineSpacing of LINE_SPACING_STEPS) {
        for (const sectionSpacing of SECTION_SPACING_STEPS) {
          const marginTopMm = Math.max(PREVIEW_MARGIN_TOP_MIN_MM, marginMm - 3);
          const fit = estimatePageFit(layout, {
            bodyFontPx: snapBodyFontPx(bodyFontPx),
            marginMm,
            marginTopMm,
            lineSpacing,
            sectionSpacing,
          });

          if (!fit.exceedsOnePage) {
            return {
              bodyFontPx: snapBodyFontPx(bodyFontPx),
              marginMm,
              marginTopMm,
              lineSpacing,
              sectionSpacing,
              estimatedPages: fit.estimatedPages,
              overflowLines: 0,
              exceedsOnePage: false,
              autoOptimized: true,
              optimizationNote:
                bodyFontPx < 11
                  ? `Auto-adjusted to ${snapBodyFontPx(bodyFontPx)}px body font to fit one page.`
                  : "Auto-optimized spacing for one-page fit at 11px body font.",
            };
          }

          if (
            !bestOverflow ||
            fit.overflowLines < bestOverflow.overflowLines ||
            (fit.overflowLines === bestOverflow.overflowLines &&
              fit.bodyFontPx > bestOverflow.bodyFontPx)
          ) {
            bestOverflow = {
              bodyFontPx: snapBodyFontPx(bodyFontPx),
              marginMm,
              marginTopMm,
              lineSpacing,
              sectionSpacing,
              estimatedPages: fit.estimatedPages,
              overflowLines: fit.overflowLines,
              exceedsOnePage: true,
              autoOptimized: true,
              warning:
                "Still exceeds one page after auto-optimization. Shorten bullets, remove low-confidence items, or combine related points in Edit Resume Details.",
            };
          }
        }
      }
    }
  }

  return (
    bestOverflow ?? {
      bodyFontPx: 11,
      marginMm: PREVIEW_MARGIN_MIN_MM,
      marginTopMm: PREVIEW_MARGIN_TOP_MIN_MM,
      lineSpacing: 1,
      sectionSpacing: PREVIEW_SECTION_SPACING_MIN,
      estimatedPages: 1,
      overflowLines: 0,
      exceedsOnePage: false,
      autoOptimized: true,
    }
  );
}
