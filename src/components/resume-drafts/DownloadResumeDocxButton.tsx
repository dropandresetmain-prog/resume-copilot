"use client";

import { useState } from "react";

import { secondaryButtonClassName } from "@/components/setup/ui";
import {
  exportResumeDocxFromApi,
  triggerBrowserDownload,
} from "@/lib/resume-draft/export-client";
import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";

type DownloadResumeDocxButtonProps = {
  draftId: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
};

export function DownloadResumeDocxButton({
  draftId,
  layoutSettings,
  disabled = false,
  disabledReason,
  className,
}: DownloadResumeDocxButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportResumeDocxFromApi({ draftId, layoutSettings });
      if (!result.downloadUrl) {
        throw new Error("Export did not return a download URL.");
      }
      triggerBrowserDownload(result.fileName, result.downloadUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to export resume DOCX.",
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
        {isExporting ? "Generating DOCX…" : "Download DOCX"}
      </button>
      {disabled && disabledReason ? (
        <span className="text-xs text-slate-500">{disabledReason}</span>
      ) : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
