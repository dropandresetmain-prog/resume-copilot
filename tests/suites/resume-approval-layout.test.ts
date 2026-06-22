import {
  areExportLayoutSettingsEqual,
  sanitizeExportLayoutSettings,
} from "../../src/lib/resume-draft/export-layout-settings";
import {
  RESUME_DRAFT_STATUS_APPROVED,
  RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
} from "../../src/lib/resume-draft/draft-status";
import {
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_BODY_FONT_MAX_PX,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_MARGIN_DEFAULT_MM,
  PREVIEW_MARGIN_TOP_DEFAULT_MM,
  PREVIEW_SECTION_SPACING_DEFAULT,
  clampPreviewBodyFontPx,
} from "../../src/lib/resume-draft/preview-settings";
import { isApprovedDraftStatus as isApprovedFromExportRequest } from "../../src/lib/resume-draft/export-request";

const approvedSettings = {
  bodyFontPx: 11,
  marginMm: 12,
  marginTopMm: 9,
  lineSpacing: 1.05,
  sectionSpacing: 0.6,
};

const changedSettings = {
  ...approvedSettings,
  bodyFontPx: 12,
};

function exportReady(
  status: string,
  stored: typeof approvedSettings | undefined,
  current: typeof approvedSettings,
  serverPageCount?: number,
): boolean {
  return (
    isApprovedDraftStatus(status) &&
    areExportLayoutSettingsEqual(stored, current) &&
    serverPageCount === 1
  );
}

function main() {
  const sanitized = sanitizeExportLayoutSettings(approvedSettings);
  const checks: [string, boolean][] = [
    ["approved status constant", RESUME_DRAFT_STATUS_APPROVED === "approved"],
    ["layout changed status constant", RESUME_DRAFT_STATUS_LAYOUT_CHANGED === "layout_changed"],
    ["isApprovedDraftStatus true for approved", isApprovedDraftStatus("approved")],
    ["isApprovedDraftStatus false for layout_changed", !isApprovedDraftStatus("layout_changed")],
    [
      "export request re-exports isApprovedDraftStatus",
      isApprovedFromExportRequest("approved") && !isApprovedFromExportRequest("layout_changed"),
    ],
    [
      "layout changed helper",
      isLayoutChangedAfterApprovalStatus("layout_changed") &&
        !isLayoutChangedAfterApprovalStatus("approved"),
    ],
    ["body font max is 20px (~15pt)", PREVIEW_BODY_FONT_MAX_PX === 20],
    ["clamp respects new max", clampPreviewBodyFontPx(25) === 20],
    ["sanitize accepts settings at new max", sanitizeExportLayoutSettings({
      bodyFontPx: 20,
      marginMm: 12,
      marginTopMm: 9,
      lineSpacing: 1.05,
      sectionSpacing: 0.6,
    })?.bodyFontPx === 20],
    ["layout settings equal when matching", areExportLayoutSettingsEqual(sanitized, approvedSettings)],
    [
      "layout settings differ when body font changes",
      !areExportLayoutSettingsEqual(sanitized, changedSettings),
    ],
    [
      "export ready when approved and settings match",
      exportReady("approved", sanitized, approvedSettings, 1),
    ],
    [
      "export not ready when approved but settings changed",
      !exportReady("approved", sanitized, changedSettings, 1),
    ],
    [
      "export not ready when approved without server validation",
      !exportReady("approved", sanitized, approvedSettings),
    ],
    [
      "export not ready when layout_changed even if settings match stored",
      !exportReady("layout_changed", sanitized, approvedSettings, 1),
    ],
    [
      "export ready after re-approve restores approved status",
      exportReady("approved", sanitizeExportLayoutSettings(changedSettings), changedSettings, 1),
    ],
    [
      "default settings sanitize completely",
      Boolean(
        sanitizeExportLayoutSettings({
          bodyFontPx: PREVIEW_BODY_FONT_DEFAULT_PX,
          marginMm: PREVIEW_MARGIN_DEFAULT_MM,
          marginTopMm: PREVIEW_MARGIN_TOP_DEFAULT_MM,
          lineSpacing: PREVIEW_LINE_SPACING_DEFAULT,
          sectionSpacing: PREVIEW_SECTION_SPACING_DEFAULT,
        }),
      ),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume approval layout checks passed.");
}

main();
