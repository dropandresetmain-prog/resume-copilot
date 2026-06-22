import { buildFinalResumeLayout, estimatePageFit } from "@/lib/resume-draft/layout";
import {
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_BODY_FONT_STEP_PX,
  PREVIEW_ITEM_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_SECTION_SPACING_DEFAULT,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";
import type { ResumeDraftContent } from "@/types/resume-draft";

export type OptimizedPreviewSettings = {
  bodyFontPx: number;
  marginMm: number;
  marginTopMm: number;
  lineSpacing: number;
  itemLineSpacing: number;
  sectionSpacing: number;
  estimatedPages: number;
  overflowLines: number;
  exceedsOnePage: boolean;
  autoOptimized: boolean;
  optimizationNote?: string;
  warning?: string;
};

const BODY_FONT_STEPS = [12.5, 12, 11.5, 11, 10.5, 10];
const MARGIN_STEPS = [12, 10, 9, 8];
const LINE_SPACING_STEPS = [PREVIEW_LINE_SPACING_DEFAULT, 1.05, 1, 0.98, PREVIEW_LINE_SPACING_MIN];
const SECTION_SPACING_STEPS = [
  PREVIEW_SECTION_SPACING_DEFAULT,
  0.6,
  0.5,
  0.45,
  0.35,
];

function snapBodyFontPx(value: number): number {
  const steps = Math.round((value - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX);
  return PREVIEW_BODY_FONT_MIN_PX + steps * PREVIEW_BODY_FONT_STEP_PX;
}

/**
 * Deterministically choose preview settings that best fit one A4 page.
 * Starts at default body font (12.5px), tightens spacing/margins, then reduces font if needed.
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
            itemLineSpacing: PREVIEW_ITEM_LINE_SPACING_DEFAULT,
            sectionSpacing,
          });

          if (!fit.exceedsOnePage) {
            return {
              bodyFontPx: snapBodyFontPx(bodyFontPx),
              marginMm,
              marginTopMm,
              lineSpacing,
              itemLineSpacing: PREVIEW_ITEM_LINE_SPACING_DEFAULT,
              sectionSpacing,
              estimatedPages: fit.estimatedPages,
              overflowLines: 0,
              exceedsOnePage: false,
              autoOptimized: true,
              optimizationNote:
                bodyFontPx < PREVIEW_BODY_FONT_DEFAULT_PX
                  ? `Auto-adjusted to ${snapBodyFontPx(bodyFontPx)}px body font to fit one page.`
                  : `Auto-optimized spacing for one-page fit at ${PREVIEW_BODY_FONT_DEFAULT_PX}px body font.`,
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
              itemLineSpacing: PREVIEW_ITEM_LINE_SPACING_DEFAULT,
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
      bodyFontPx: PREVIEW_BODY_FONT_DEFAULT_PX,
      marginMm: PREVIEW_MARGIN_MIN_MM,
      marginTopMm: PREVIEW_MARGIN_TOP_MIN_MM,
      lineSpacing: PREVIEW_LINE_SPACING_DEFAULT,
      itemLineSpacing: PREVIEW_ITEM_LINE_SPACING_DEFAULT,
      sectionSpacing: PREVIEW_SECTION_SPACING_MIN,
      estimatedPages: 1,
      overflowLines: 0,
      exceedsOnePage: false,
      autoOptimized: true,
    }
  );
}
