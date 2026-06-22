"use client";

import { useState } from "react";

import { secondaryButtonClassName } from "@/components/setup/ui";
import { downloadCoverLetterExport } from "@/lib/cover-letter/export-client";

export function DownloadCoverLetterPdfButton({
  draftId,
  disabled = false,
}: {
  draftId: string;
  disabled?: boolean;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={isExporting || disabled}
        className={secondaryButtonClassName}
        onClick={() => {
          setIsExporting(true);
          setError(null);
          void downloadCoverLetterExport(draftId, "pdf")
            .catch((exportError) => {
              setError(
                exportError instanceof Error
                  ? exportError.message
                  : "Failed to export cover letter PDF.",
              );
            })
            .finally(() => setIsExporting(false));
        }}
      >
        {isExporting ? "Generating PDF…" : "Download PDF"}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
