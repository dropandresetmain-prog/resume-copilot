import type {
  ResumeDraftApiErrorResponse,
  ResumeDraftGenerationRequest,
  ResumeDraftGenerationResponse,
  ResumeDraftProviderStatusResponse,
} from "@/types/resume-draft";

export type ResumeDraftClientError = Error & {
  rawModelResponse?: string;
  statusCode?: number;
  providerStatus?: Partial<ResumeDraftProviderStatusResponse>;
};

export async function fetchResumeDraftProviderStatus(): Promise<ResumeDraftProviderStatusResponse> {
  const response = await fetch("/api/ai/generate-resume");
  const payload = (await response.json().catch(() => null)) as
    | ResumeDraftProviderStatusResponse
    | null;

  if (!response.ok || !payload?.provider) {
    throw new Error("Failed to load resume draft provider status.");
  }

  return payload;
}

export async function requestResumeDraftGeneration(
  request: ResumeDraftGenerationRequest,
): Promise<ResumeDraftGenerationResponse> {
  const response = await fetch("/api/ai/generate-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | (ResumeDraftGenerationResponse & ResumeDraftApiErrorResponse)
    | null;

  if (!response.ok) {
    const error = new Error(
      payload?.error ?? "AI resume draft generation request failed.",
    ) as ResumeDraftClientError;
    error.rawModelResponse = payload?.rawModelResponse;
    error.statusCode = response.status;
    error.providerStatus = payload
      ? {
          provider: payload.provider,
          isMock: payload.isMock,
          providerLabel: payload.providerLabel,
          modelName: payload.modelName,
        }
      : undefined;
    throw error;
  }

  if (!payload?.content) {
    throw new Error("AI resume draft response was invalid.");
  }

  return payload;
}
