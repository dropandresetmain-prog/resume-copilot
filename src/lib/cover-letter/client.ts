import type {
  CoverLetterApiErrorResponse,
  CoverLetterGenerationInput,
  CoverLetterGenerationResponse,
  CoverLetterProviderStatusResponse,
} from "@/types/cover-letter-draft";

export type CoverLetterClientError = Error & {
  rawModelResponse?: string;
  statusCode?: number;
};

export async function fetchCoverLetterProviderStatus(): Promise<CoverLetterProviderStatusResponse> {
  const response = await fetch("/api/ai/generate-cover-letter");
  const payload = (await response.json().catch(() => null)) as
    | CoverLetterProviderStatusResponse
    | null;

  if (!response.ok || !payload?.provider) {
    throw new Error("Failed to load cover letter provider status.");
  }

  return payload;
}

export async function requestCoverLetterGeneration(
  input: CoverLetterGenerationInput,
): Promise<CoverLetterGenerationResponse> {
  const response = await fetch("/api/ai/generate-cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | (CoverLetterGenerationResponse & CoverLetterApiErrorResponse)
    | null;

  if (!response.ok) {
    const error = new Error(
      payload?.error ?? "Cover letter generation request failed.",
    ) as CoverLetterClientError;
    error.rawModelResponse = payload?.rawModelResponse;
    error.statusCode = response.status;
    throw error;
  }

  if (!payload?.formalContent) {
    throw new Error("Cover letter response was invalid.");
  }

  return payload;
}
