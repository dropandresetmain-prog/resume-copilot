"use client";

import { useState } from "react";

import { secondaryButtonClassName } from "@/components/setup/ui";
import { downloadCoverLetterExport } from "@/lib/cover-letter/export-client";

export function DownloadCoverLetterDocxButton({ draftId }: { draftId: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={isExporting}
        className={secondaryButtonClassName}
        onClick={() => {
          setIsExporting(true);
          setError(null);
          void downloadCoverLetterExport(draftId, "docx")
            .catch((exportError) => {
              setError(
                exportError instanceof Error
                  ? exportError.message
                  : "Failed to export cover letter DOCX.",
              );
            })
            .finally(() => setIsExporting(false));
        }}
      >
        {isExporting ? "Generating DOCX…" : "Download DOCX"}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
