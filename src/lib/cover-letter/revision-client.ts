import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CoverLetterRevisionRequest,
  CoverLetterRevisionResponse,
} from "@/types/cover-letter-draft";
import { isCoverLetterRevisionAction } from "@/lib/cover-letter/revision-prompt";

async function getRevisionAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Sign in required to revise cover letters.");
  }
  return accessToken;
}

export async function requestCoverLetterRevision(
  input: CoverLetterRevisionRequest,
): Promise<CoverLetterRevisionResponse> {
  const accessToken = await getRevisionAccessToken();
  const response = await fetch("/api/ai/revise-cover-letter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | (CoverLetterRevisionResponse & { error?: string })
    | null;

  if (response.status === 401) {
    throw new Error(
      payload?.error === "Authorization required."
        ? "Sign in required to revise cover letters."
        : payload?.error ?? "Sign in required to revise cover letters.",
    );
  }

  if (!response.ok || !payload?.body) {
    throw new Error(payload?.error ?? "Cover letter revision failed.");
  }

  return payload;
}

/** True when the revision API should write the result to Supabase (default). */
export function coverLetterRevisionShouldPersist(
  request: Pick<CoverLetterRevisionRequest, "persist">,
): boolean {
  return request.persist !== false;
}

export function validateCoverLetterRevisionRequest(body: CoverLetterRevisionRequest): string | null {
  if (!body.draftId?.trim()) {
    return "draftId is required.";
  }
  if (!body.currentBody?.trim()) {
    return "currentBody is required.";
  }
  if (!isCoverLetterRevisionAction(body.action)) {
    return "A valid revision action is required.";
  }
  if (body.action === "custom" && !body.customInstruction?.trim()) {
    return "customInstruction is required for custom revisions.";
  }
  return null;
}
