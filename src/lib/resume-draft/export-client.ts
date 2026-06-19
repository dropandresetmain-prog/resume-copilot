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
export type ExportDownloadBehavior = "anchor-download" | "same-tab-navigate";

export const MOBILE_EXPORT_OPEN_HINT =
  "On mobile, your browser may open the file instead of saving it. Use Share or Save to Files if needed.";

export const EXPORT_BLOB_URL_REVOKE_MS = 60_000;

/** Lightweight counters for verifying one export request + one delivery action per click. */
export type ExportDeliveryMetrics = {
  apiRequests: number;
  blobFetches: number;
  deliveryActions: number;
};

let deliveryMetrics: ExportDeliveryMetrics = {
  apiRequests: 0,
  blobFetches: 0,
  deliveryActions: 0,
};

export function getExportDeliveryMetrics(): Readonly<ExportDeliveryMetrics> {
  return { ...deliveryMetrics };
}

export function resetExportDeliveryMetrics(): void {
  deliveryMetrics = { apiRequests: 0, blobFetches: 0, deliveryActions: 0 };
}

/** Detect mobile browsers where popup/download behavior is unreliable. */
export function isMobileExportClient(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
}

export function resolveExportDownloadBehavior(
  _fileType: ResumeExportFileType,
  options?: { mobile?: boolean },
): ExportDownloadBehavior {
  const mobile = options?.mobile ?? isMobileExportClient();
  if (mobile) {
    return "same-tab-navigate";
  }
  return "anchor-download";
}

export function parseContentDispositionFileName(header: string | null): string | undefined {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1];
}

/** Prefer API fileName; fall back to Content-Disposition or default stem. */
export function resolveExportFileName(
  apiFileName: string | undefined,
  contentDisposition: string | null,
  fallback: string,
): string {
  const fromApi = apiFileName?.trim();
  if (fromApi) {
    return fromApi;
  }
  return parseContentDispositionFileName(contentDisposition) ?? fallback;
}

async function exportResumeFromApi(
  endpoint: "/api/export/resume-docx" | "/api/export/resume-pdf",
  options: {
    draftId: string;
    layoutSettings?: Partial<ResumeLayoutSettings>;
  },
  failureMessage: string,
): Promise<ResumeExportResponse> {
  deliveryMetrics.apiRequests += 1;

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
    if (response.status === 422 && contentType.includes("application/json")) {
      const payload = (await response.json()) as {
        error?: string;
        pageCount?: number;
        message?: string;
        suggestedActions?: string[];
      };
      const detail =
        payload.suggestedActions?.length ? ` ${payload.suggestedActions.join(" ")}` : "";
      throw new Error(
        (payload.message ?? payload.error ?? failureMessage) +
          (payload.pageCount ? ` (${payload.pageCount} pages)` : "") +
          detail,
      );
    }
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? failureMessage);
    }
    throw new Error(failureMessage);
  }

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as ResumeExportResponse;
    if (!payload.fileName?.trim()) {
      throw new Error("Export did not return a file name.");
    }
    if (!payload.downloadUrl?.trim()) {
      throw new Error("Export did not return a download URL.");
    }
    return payload;
  }

  const blob = await response.blob();
  const fileName = resolveExportFileName(
    undefined,
    response.headers.get("content-disposition"),
    endpoint.includes("pdf") ? "Resume.pdf" : "Resume.docx",
  );
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

/** Fetch export bytes once — used for signed URLs and blob: URLs before delivery. */
export async function fetchExportBlob(downloadUrl: string): Promise<Blob> {
  deliveryMetrics.blobFetches += 1;
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch export file.");
  }
  return response.blob();
}

export function scheduleRevokeObjectUrl(objectUrl: string): void {
  if (objectUrl.startsWith("blob:")) {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), EXPORT_BLOB_URL_REVOKE_MS);
  }
}

/** Single controlled download with intended filename (same-origin blob URL). */
export function triggerFileDownload(fileName: string, objectUrl: string): void {
  deliveryMetrics.deliveryActions += 1;
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export type DeliverExportedFileResult = {
  mobileHint?: string;
};

/**
 * Deliver export via one blob fetch + one anchor download.
 * Avoids window.open on remote signed URLs (prevents browser/Adobe duplicate handling).
 */
export async function deliverExportedFile(
  fileName: string,
  downloadUrl: string,
  fileType: ResumeExportFileType,
): Promise<DeliverExportedFileResult> {
  const blob = await fetchExportBlob(downloadUrl);
  const objectUrl = URL.createObjectURL(blob);

  try {
    triggerFileDownload(fileName, objectUrl);
    scheduleRevokeObjectUrl(objectUrl);

    const mobile = resolveExportDownloadBehavior(fileType) === "same-tab-navigate";
    return mobile ? { mobileHint: MOBILE_EXPORT_OPEN_HINT } : {};
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/** @deprecated v0.6.8+ — use deliverExportedFile (blob download). */
export function navigateToExportUrl(downloadUrl: string): void {
  window.location.assign(downloadUrl);
}

/** @deprecated v0.6.8+ — remote signed URLs caused duplicate tab/download/Adobe behavior. */
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

  scheduleRevokeObjectUrl(downloadUrl);
}

/** @deprecated Use triggerFileDownload after fetchExportBlob. */
export function triggerDocxDownload(fileName: string, downloadUrl: string): void {
  triggerFileDownload(fileName, downloadUrl);
  scheduleRevokeObjectUrl(downloadUrl);
}

/** @deprecated Use triggerFileDownload. */
export function triggerBrowserDownload(fileName: string, downloadUrl: string): void {
  triggerDocxDownload(fileName, downloadUrl);
}
