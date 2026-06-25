"use client";

import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import {
  buildLayoutFixSuggestions,
  type LayoutFixSuggestion,
} from "@/lib/resume-draft/layout-fix-suggestions";
import { formatOverflowAmount } from "@/lib/resume-draft/pdf-fit-measurement";
import type { PdfPreviewOverflowMeasurement } from "@/lib/resume-draft/pdf-preview-overflow";
import { secondaryButtonClassName } from "@/components/setup/ui";

export const EXPORT_FIT_STATUS_PANEL_TEST_ID = "export-fit-status-panel";
export const PREVIEW_EXPORT_MISMATCH_TEST_ID = "preview-export-mismatch";
export const LAYOUT_FIX_SUGGESTIONS_TEST_ID = "layout-fix-suggestions";

export type ServerValidationFailure = {
  pageCount: number;
  message: string;
  suggestedActions: string[];
  overflowPx?: number;
  overflowMm?: number;
};

type ExportFitStatusPanelProps = {
  previewMeasurement: PdfPreviewOverflowMeasurement;
  validationFailure: ServerValidationFailure | null;
  serverValidated: boolean;
  isValidating?: boolean;
  layoutSettings: ResumeLayoutSettings;
  hasAdditionalExperience: boolean;
  onApplyLayoutFix?: (patch: Partial<ResumeLayoutSettings>) => void;
  onOpenLayoutControls?: () => void;
};

type FitScenario =
  | "aligned-ok"
  | "aligned-overflow"
  | "preview-fits-server-fails"
  | "preview-overflow-server-ok"
  | "preview-overflow-unvalidated"
  | "pending";

function resolveFitScenario(options: {
  previewExceeds: boolean;
  serverFailed: boolean;
  serverValidated: boolean;
  isValidating?: boolean;
}): FitScenario {
  if (options.isValidating) {
    return "pending";
  }
  if (options.serverValidated) {
    return "aligned-ok";
  }
  if (options.serverFailed && options.previewExceeds) {
    return "aligned-overflow";
  }
  if (options.serverFailed && !options.previewExceeds) {
    return "preview-fits-server-fails";
  }
  if (options.previewExceeds) {
    return "preview-overflow-unvalidated";
  }
  return "pending";
}

function previewOverflowLabel(measurement: PdfPreviewOverflowMeasurement): string {
  if (!measurement.exceedsOnePage) {
    return "Fits one page";
  }
  return `${formatOverflowAmount({
    overflowPx: measurement.overflowPx,
    overflowMm: measurement.overflowPx * 0.264583,
  })} over`;
}

function serverOverflowLabel(failure: ServerValidationFailure | null): string {
  if (!failure) {
    return "Not validated yet";
  }
  if (failure.overflowMm && failure.overflowMm > 0) {
    return `${formatOverflowAmount({
      overflowPx: failure.overflowPx ?? 0,
      overflowMm: failure.overflowMm,
    })} over · ${failure.pageCount} page(s)`;
  }
  return `${failure.pageCount} page(s) — export blocked`;
}

function scenarioBannerClass(scenario: FitScenario): string {
  switch (scenario) {
    case "aligned-ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "preview-fits-server-fails":
      return "border-amber-300 bg-amber-50 text-amber-950";
    case "aligned-overflow":
      return "border-red-200 bg-red-50 text-red-950";
    case "preview-overflow-unvalidated":
      return "border-amber-200 bg-amber-50 text-amber-950";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function scenarioMessage(
  scenario: FitScenario,
  previewMeasurement: PdfPreviewOverflowMeasurement,
  validationFailure: ServerValidationFailure | null,
): string {
  switch (scenario) {
    case "aligned-ok":
      return "Server PDF validated as one page — export truth matches approval. Browser preview is approximate only.";
    case "preview-fits-server-fails":
      return `Browser preview fits one page, but server validation reports ${serverOverflowLabel(
        validationFailure,
      )}. Server Puppeteer PDF is the export gate — adjust layout and re-approve.`;
    case "aligned-overflow":
      return `Browser preview and server validation both report overflow (${previewOverflowLabel(
        previewMeasurement,
      )} in preview; ${serverOverflowLabel(validationFailure)} on server). Use the suggested fixes below.`;
    case "preview-overflow-unvalidated":
      return `Browser preview reports ${previewOverflowLabel(
        previewMeasurement,
      )}. Run Approve for Export for server validation — only the server PDF page count unlocks download.`;
    case "pending":
      return "Approve for Export runs server Puppeteer validation (~3–15s). Server PDF page count is export truth; browser preview is approximate.";
    default:
      return "Approve for Export to confirm one-page server PDF before download.";
  }
}

function LayoutFixSuggestionsList({
  suggestions,
  onApplyLayoutFix,
  onOpenLayoutControls,
}: {
  suggestions: LayoutFixSuggestion[];
  onApplyLayoutFix?: (patch: Partial<ResumeLayoutSettings>) => void;
  onOpenLayoutControls?: () => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-lg border border-slate-200 bg-white p-3"
      data-testid={LAYOUT_FIX_SUGGESTIONS_TEST_ID}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Suggested fixes
      </p>
      <ul className="mt-2 space-y-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{suggestion.label}</p>
              <p className="text-xs text-slate-600">{suggestion.description}</p>
            </div>
            {suggestion.kind === "layout" && suggestion.patch && onApplyLayoutFix ? (
              <button
                type="button"
                className={`${secondaryButtonClassName} shrink-0 text-xs`}
                data-action={`apply-layout-fix-${suggestion.id}`}
                onClick={() => onApplyLayoutFix(suggestion.patch!)}
              >
                Apply
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {onOpenLayoutControls ? (
        <button
          type="button"
          className={`${secondaryButtonClassName} mt-3 text-xs`}
          data-action="open-layout-controls"
          onClick={onOpenLayoutControls}
        >
          Open layout controls
        </button>
      ) : null}
    </div>
  );
}

export function ExportFitStatusPanel({
  previewMeasurement,
  validationFailure,
  serverValidated,
  isValidating = false,
  layoutSettings,
  hasAdditionalExperience,
  onApplyLayoutFix,
  onOpenLayoutControls,
}: ExportFitStatusPanelProps) {
  const previewExceeds = previewMeasurement.exceedsOnePage;
  const serverFailed = validationFailure !== null;
  const scenario = resolveFitScenario({
    previewExceeds,
    serverFailed,
    serverValidated,
    isValidating,
  });

  const mismatchScenario =
    scenario === "preview-fits-server-fails" || scenario === "aligned-overflow";

  const suggestions =
    validationFailure !== null
      ? buildLayoutFixSuggestions({
          layoutSettings,
          serverOverflowPx: validationFailure.overflowPx,
          serverPageCount: validationFailure.pageCount,
          previewOverflowPx: previewMeasurement.overflowPx,
          hasAdditionalExperience,
        })
      : previewExceeds
        ? buildLayoutFixSuggestions({
            layoutSettings,
            previewOverflowPx: previewMeasurement.overflowPx,
            hasAdditionalExperience,
          }).filter((suggestion) => suggestion.kind === "layout")
        : [];

  return (
    <div
      className="space-y-3"
      data-testid={EXPORT_FIT_STATUS_PANEL_TEST_ID}
      data-fit-scenario={scenario}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Browser PDF preview
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {previewOverflowLabel(previewMeasurement)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Approximate · your OS fonts</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Server PDF validation
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {isValidating
              ? "Validating…"
              : serverValidated
                ? "1 page — approved"
                : serverOverflowLabel(validationFailure)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Export truth · Linux Chromium</p>
        </div>
      </div>

      <p
        className={`rounded-lg border px-3 py-2 text-sm ${scenarioBannerClass(scenario)}`}
        role="status"
        data-testid={mismatchScenario ? PREVIEW_EXPORT_MISMATCH_TEST_ID : "export-fit-guidance"}
      >
        {scenarioMessage(scenario, previewMeasurement, validationFailure)}
      </p>

      {validationFailure ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p className="font-medium">{validationFailure.message}</p>
          {validationFailure.suggestedActions.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validationFailure.suggestedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <LayoutFixSuggestionsList
        suggestions={suggestions}
        onApplyLayoutFix={onApplyLayoutFix}
        onOpenLayoutControls={onOpenLayoutControls}
      />
    </div>
  );
}
