import type {
  CoverLetterRevisionRequest,
  CoverLetterRevisionResponse,
} from "@/types/cover-letter-draft";
import { isCoverLetterRevisionAction } from "@/lib/cover-letter/revision-prompt";

export async function requestCoverLetterRevision(
  input: CoverLetterRevisionRequest,
): Promise<CoverLetterRevisionResponse> {
  const response = await fetch("/api/ai/revise-cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | (CoverLetterRevisionResponse & { error?: string })
    | null;

  if (!response.ok || !payload?.body) {
    throw new Error(payload?.error ?? "Cover letter revision failed.");
  }

  return payload;
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
