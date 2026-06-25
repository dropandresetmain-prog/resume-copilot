import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import {
  clampPreviewBodyFontPx,
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_BODY_FONT_STEP_PX,
  PREVIEW_ITEM_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";
import { formatOverflowAmount } from "@/lib/resume-draft/pdf-fit-measurement";

export type LayoutFixSuggestionKind = "layout" | "content";

export type LayoutFixSuggestion = {
  id: string;
  kind: LayoutFixSuggestionKind;
  label: string;
  description: string;
  patch?: Partial<ResumeLayoutSettings>;
};

const BODY_FONT_STEPS = [12.5, 12, 11.5, 11, 10.5, 10];
const MARGIN_STEPS = [12, 10, 9, 8];
const LINE_SPACING_STEPS = [1.12, 1.05, 1, 0.98, PREVIEW_LINE_SPACING_MIN];
const SECTION_SPACING_STEPS = [0.65, 0.6, 0.5, 0.45, 0.35];

function nextLowerStep(current: number, steps: readonly number[]): number | undefined {
  const index = steps.findIndex((step) => Math.abs(step - current) < 0.001 || step < current);
  if (index === -1) {
    return undefined;
  }
  for (let i = index; i < steps.length; i += 1) {
    if (steps[i] < current - 0.001) {
      return steps[i];
    }
  }
  return undefined;
}

function nextBodyFontStep(current: number): number | undefined {
  const snapped = clampPreviewBodyFontPx(current);
  const index = BODY_FONT_STEPS.findIndex((step) => Math.abs(step - snapped) < 0.001);
  const start = index === -1 ? 0 : index + 1;
  for (let i = start; i < BODY_FONT_STEPS.length; i += 1) {
    if (BODY_FONT_STEPS[i] < snapped - 0.001) {
      return BODY_FONT_STEPS[i];
    }
  }
  if (snapped > PREVIEW_BODY_FONT_MIN_PX + 0.001) {
    return clampPreviewBodyFontPx(snapped - PREVIEW_BODY_FONT_STEP_PX);
  }
  return undefined;
}

function buildLayoutSliderSuggestions(
  settings: ResumeLayoutSettings,
): LayoutFixSuggestion[] {
  const suggestions: LayoutFixSuggestion[] = [];

  const nextFont = nextBodyFontStep(settings.bodyFontPx);
  if (nextFont !== undefined) {
    suggestions.push({
      id: "reduce-body-font",
      kind: "layout",
      label: `Reduce body font to ${nextFont}px`,
      description: "Smallest single-slider change that usually recovers the most vertical space.",
      patch: { bodyFontPx: nextFont },
    });
  }

  const nextSection = nextLowerStep(settings.sectionSpacing, SECTION_SPACING_STEPS);
  if (nextSection !== undefined) {
    suggestions.push({
      id: "reduce-section-spacing",
      kind: "layout",
      label: `Reduce section spacing to ${nextSection.toFixed(2)} rem`,
      description: "Tighten gaps between Work Experience, Education, and Skills sections.",
      patch: { sectionSpacing: nextSection },
    });
  }

  const nextLine = nextLowerStep(settings.lineSpacing, LINE_SPACING_STEPS);
  if (nextLine !== undefined) {
    suggestions.push({
      id: "reduce-line-spacing",
      kind: "layout",
      label: `Reduce line spacing to ${nextLine.toFixed(2)}`,
      description: "Compress wrapped lines inside bullets and contact rows.",
      patch: { lineSpacing: nextLine },
    });
  }

  const nextMargin = nextLowerStep(settings.marginMm, MARGIN_STEPS);
  if (nextMargin !== undefined && nextMargin >= PREVIEW_MARGIN_MIN_MM) {
    const marginTopMm = Math.max(PREVIEW_MARGIN_TOP_MIN_MM, nextMargin - 3);
    suggestions.push({
      id: "reduce-margins",
      kind: "layout",
      label: `Reduce side margins to ${nextMargin} mm`,
      description: `Also sets top margin to ${marginTopMm} mm for a compact header band.`,
      patch: { marginMm: nextMargin, marginTopMm },
    });
  }

  if (settings.itemLineSpacing > PREVIEW_ITEM_LINE_SPACING_DEFAULT + 0.001) {
    suggestions.push({
      id: "reduce-item-spacing",
      kind: "layout",
      label: `Reduce bullet/item spacing to ${PREVIEW_ITEM_LINE_SPACING_DEFAULT.toFixed(2)}`,
      description: "Tighten gaps between bullets and compact rows.",
      patch: { itemLineSpacing: PREVIEW_ITEM_LINE_SPACING_DEFAULT },
    });
  }

  return suggestions;
}

function buildContentSuggestions(options: {
  hasAdditionalExperience: boolean;
  serverPageCount?: number;
}): LayoutFixSuggestion[] {
  const suggestions: LayoutFixSuggestion[] = [];

  if (options.hasAdditionalExperience) {
    suggestions.push({
      id: "trim-additional-experience",
      kind: "content",
      label: "Shorten or hide Additional Experience lines",
      description: "Edit resume text and remove lower-priority additional experience entries.",
    });
  }

  suggestions.push({
    id: "reduce-bullets",
    kind: "content",
    label: "Remove or shorten role bullets",
    description: "Use Fix resume evidence or Edit resume text to drop lower-priority bullets.",
  });

  if ((options.serverPageCount ?? 1) > 1) {
    suggestions.push({
      id: "re-approve",
      kind: "content",
      label: "Re-approve for export after changes",
      description: "Server Puppeteer validation is the export gate — run Approve again after tuning layout.",
    });
  }

  return suggestions;
}

export type BuildLayoutFixSuggestionsInput = {
  layoutSettings: ResumeLayoutSettings;
  serverOverflowPx?: number;
  serverPageCount?: number;
  previewOverflowPx?: number;
  hasAdditionalExperience?: boolean;
};

/** Prioritized, specific fixes for one-page export failures. */
export function buildLayoutFixSuggestions(
  input: BuildLayoutFixSuggestionsInput,
): LayoutFixSuggestion[] {
  const overflowLabel =
    input.serverOverflowPx && input.serverOverflowPx > 0
      ? formatOverflowAmount({
          overflowPx: input.serverOverflowPx,
          overflowMm: input.serverOverflowPx * 0.264583,
        })
      : null;

  const layoutSuggestions = buildLayoutSliderSuggestions(input.layoutSettings).map((suggestion) => ({
    ...suggestion,
    description: overflowLabel
      ? `${suggestion.description} Server overflow: ${overflowLabel}.`
      : suggestion.description,
  }));

  const contentSuggestions = buildContentSuggestions({
    hasAdditionalExperience: input.hasAdditionalExperience ?? false,
    serverPageCount: input.serverPageCount,
  });

  return [...layoutSuggestions, ...contentSuggestions];
}

export function buildLayoutFixActionLabels(suggestions: LayoutFixSuggestion[]): string[] {
  return suggestions.map((suggestion) => suggestion.label);
}
