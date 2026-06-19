import { getSupabaseClient } from "@/lib/supabase/client";
import type { ResumeLayoutSettings } from "@/lib/resume-draft/document-model";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export type ResumePdfOnePageBlockedPayload = {
  error: string;
  pageCount: number;
  message?: string;
  suggestedActions?: string[];
};

export class ResumePdfOnePageBlockedError extends Error {
  readonly pageCount: number;
  readonly suggestedActions: string[];

  constructor(payload: ResumePdfOnePageBlockedPayload) {
    super(payload.message ?? payload.error);
    this.pageCount = payload.pageCount;
    this.suggestedActions = payload.suggestedActions ?? [];
  }
}

export type ApproveResumeDraftResponse = {
  draft: GeneratedResumeDraftRecord;
  pageCount: number;
  valid: boolean;
};

async function authorizedFetch(endpoint: string, body: unknown): Promise<Response> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to continue.");
  }

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

export async function approveResumeDraftForExport(options: {
  draftId: string;
  layoutSettings: Partial<ResumeLayoutSettings>;
}): Promise<ApproveResumeDraftResponse> {
  const response = await authorizedFetch("/api/approve/resume-draft", options);
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status === 422 && contentType.includes("application/json")) {
    const payload = (await response.json()) as ResumePdfOnePageBlockedPayload;
    throw new ResumePdfOnePageBlockedError(payload);
  }

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Approve for export failed.");
    }
    throw new Error("Approve for export failed.");
  }

  return (await response.json()) as ApproveResumeDraftResponse;
}

export function formatOnePageBlockedMessage(error: ResumePdfOnePageBlockedError): string {
  const actions =
    error.suggestedActions.length > 0
      ? ` ${error.suggestedActions.join(" ")}`
      : "";
  return `${error.message}${actions}`;
}
