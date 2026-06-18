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

export function triggerBrowserDownload(fileName: string, downloadUrl: string): void {
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
