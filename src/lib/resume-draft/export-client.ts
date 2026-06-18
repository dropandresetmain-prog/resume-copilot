import { getSupabaseClient } from "@/lib/supabase/client";
import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";

export type ResumeDocxExportResponse = {
  fileName: string;
  downloadUrl?: string;
  storedFileId?: string;
  storagePath?: string;
};

export async function exportResumeDocxFromApi(options: {
  draftId: string;
  layoutSettings?: Partial<ResumeLayoutSettings>;
}): Promise<ResumeDocxExportResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to export.");
  }

  const response = await fetch("/api/export/resume-docx", {
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
      throw new Error(payload.error ?? "Resume DOCX export failed.");
    }
    throw new Error("Resume DOCX export failed.");
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as ResumeDocxExportResponse;
  }

  const blob = await response.blob();
  const fileName =
    response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
    "Resume.docx";
  const downloadUrl = URL.createObjectURL(blob);
  return { fileName, downloadUrl };
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
