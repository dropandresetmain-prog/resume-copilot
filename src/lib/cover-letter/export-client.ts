import { getSupabaseClient } from "@/lib/supabase/client";

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Sign in required to export cover letters.");
  }
  return accessToken;
}

function parseContentDispositionFileName(header: string | null): string | undefined {
  if (!header) {
    return undefined;
  }
  const match = /filename="([^"]+)"/i.exec(header);
  return match?.[1];
}

export async function downloadCoverLetterExport(
  draftId: string,
  format: "pdf" | "docx",
): Promise<{ fileName: string }> {
  const accessToken = await getAccessToken();
  const endpoint =
    format === "pdf" ? "/api/export/cover-letter-pdf" : "/api/export/cover-letter-docx";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ draftId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Cover letter ${format.toUpperCase()} export failed.`);
  }

  const blob = await response.blob();
  const fileName =
    parseContentDispositionFileName(response.headers.get("Content-Disposition")) ??
    `cover-letter.${format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return { fileName };
}
