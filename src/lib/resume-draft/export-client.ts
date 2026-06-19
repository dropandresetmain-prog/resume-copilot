import { getSupabaseClient } from "@/lib/supabase/client";
import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";

export type ResumeExportResponse = {
  fileName: string;
  downloadUrl?: string;
  storedFileId?: string;
  storagePath?: string;
  warnings?: string[];
};

/** @deprecated Use ResumeExportResponse */
export type ResumeDocxExportResponse = ResumeExportResponse;

/** PDF is the primary final deliverable; DOCX is editable secondary output. */
export const PRIMARY_FINAL_EXPORT_FORMAT = "pdf" as const;
export const SECONDARY_EDITABLE_EXPORT_FORMAT = "docx" as const;

export type ResumeExportFileType = typeof PRIMARY_FINAL_EXPORT_FORMAT | typeof SECONDARY_EDITABLE_EXPORT_FORMAT;
export type ExportDownloadBehavior = "open-new-tab" | "anchor-download";

export function resolveExportDownloadBehavior(
  fileType: ResumeExportFileType,
): ExportDownloadBehavior {
  return fileType === PRIMARY_FINAL_EXPORT_FORMAT ? "open-new-tab" : "anchor-download";
}

async function exportResumeFromApi(
  endpoint: "/api/export/resume-docx" | "/api/export/resume-pdf",
  options: {
    draftId: string;
    layoutSettings?: Partial<ResumeLayoutSettings>;
  },
  failureMessage: string,
): Promise<ResumeExportResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to export.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(options),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? failureMessage);
    }
    throw new Error(failureMessage);
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as ResumeExportResponse;
  }

  const blob = await response.blob();
  const fileName =
    response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
    (endpoint.includes("pdf") ? "Resume.pdf" : "Resume.docx");
  const downloadUrl = URL.createObjectURL(blob);
  const warningsHeader = response.headers.get("x-export-warnings");
  return {
    fileName,
    downloadUrl,
    warnings: warningsHeader ? [warningsHeader] : undefined,
  };
}

export async function exportResumeDocxFromApi(options: {
  draftId: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
}): Promise<ResumeExportResponse> {
  return exportResumeFromApi("/api/export/resume-docx", options, "Resume DOCX export failed.");
}

export async function exportResumePdfFromApi(options: {
  draftId: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
}): Promise<ResumeExportResponse> {
  return exportResumeFromApi("/api/export/resume-pdf", options, "Resume PDF export failed.");
}

/** PDF final deliverable — open in a new browser tab for viewing/printing. */
export function openPdfInNewTab(downloadUrl: string): void {
  const opened = window.open(downloadUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  if (downloadUrl.startsWith("blob:")) {
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  }
}

/** DOCX secondary output — trigger file download, not a new tab. */
export function triggerDocxDownload(fileName: string, downloadUrl: string): void {
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (downloadUrl.startsWith("blob:")) {
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  }
}

export function deliverExportedFile(
  fileName: string,
  downloadUrl: string,
  fileType: ResumeExportFileType,
): void {
  if (resolveExportDownloadBehavior(fileType) === "open-new-tab") {
    openPdfInNewTab(downloadUrl);
    return;
  }
  triggerDocxDownload(fileName, downloadUrl);
}

/** @deprecated Use openPdfInNewTab or triggerDocxDownload */
export function triggerBrowserDownload(fileName: string, downloadUrl: string): void {
  triggerDocxDownload(fileName, downloadUrl);
}
