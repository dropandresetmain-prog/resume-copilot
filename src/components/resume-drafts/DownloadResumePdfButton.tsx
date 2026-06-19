"use client";

import { useState } from "react";

import { secondaryButtonClassName } from "@/components/setup/ui";
import {
  deliverExportedFile,
  exportResumePdfFromApi,
} from "@/lib/resume-draft/export-client";
import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";

type DownloadResumePdfButtonProps = {
  draftId: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  exceedsOnePage?: boolean;
  onWarning?: (message: string) => void;
};

export function DownloadResumePdfButton({
  draftId,
  layoutSettings,
  disabled = false,
  disabledReason,
  className,
  exceedsOnePage = false,
  onWarning,
}: DownloadResumePdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsExporting(true);
    setError(null);
    try {
      if (exceedsOnePage) {
        onWarning?.(
          "Layout exceeds the one-page target. PDF will export with current settings — adjust sliders or reduce content.",
        );
      }
      const result = await exportResumePdfFromApi({ draftId, layoutSettings });
      if (!result.downloadUrl) {
        throw new Error("Export did not return a download URL.");
      }
      const delivery = await deliverExportedFile(result.fileName, result.downloadUrl, "pdf");
      if (delivery.mobileHint) {
        onWarning?.(delivery.mobileHint);
      }
      if (result.warnings?.length) {
        onWarning?.(result.warnings.join(" "));
      }
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to export resume PDF.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const isDisabled = disabled || isExporting;
  const buttonClassName = className ?? secondaryButtonClassName;

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isDisabled}
        className={buttonClassName}
        title={disabled ? disabledReason : undefined}
      >
        {isExporting ? "Generating PDF…" : "Download PDF"}
      </button>
      {disabled && disabledReason ? (
        <span className="text-xs text-slate-500">{disabledReason}</span>
      ) : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
