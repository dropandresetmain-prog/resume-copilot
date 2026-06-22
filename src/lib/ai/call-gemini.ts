import { resolveGeminiModelsForCall } from "@/lib/ai/config";

export const GEMINI_MAX_ATTEMPTS = 3;
export const GEMINI_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export class GeminiHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Gemini API error (${status}): ${body}`);
    this.name = "GeminiHttpError";
    this.status = status;
    this.body = body;
  }
}

export function isTransientGeminiHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status >= 500;
}

export function isTransientGeminiError(error: unknown): boolean {
  if (error instanceof GeminiHttpError) {
    return isTransientGeminiHttpStatus(error.status);
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    /\b503\b|UNAVAILABLE|high demand|\b429\b|RESOURCE_EXHAUSTED|rate limit|ETIMEDOUT|ECONNRESET|fetch failed|network error|socket hang up/i.test(
      message,
    )
  );
}

export type CallGeminiGenerateContentOptions = {
  apiKey: string;
  prompt: string;
  temperature: number;
  responseMimeType?: string;
  model?: string;
  signal?: AbortSignal;
};

function buildGeminiUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function extractGeminiText(payload: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}): string {
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned no content.");
  }
  return text;
}

export async function callGeminiGenerateContent(
  options: CallGeminiGenerateContentOptions,
): Promise<string> {
  const model = options.model ?? resolveGeminiModelsForCall()[0];
  const response = await fetch(buildGeminiUrl(model, options.apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: options.prompt }] }],
      generationConfig: {
        temperature: options.temperature,
        ...(options.responseMimeType
          ? { responseMimeType: options.responseMimeType }
          : {}),
      },
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GeminiHttpError(response.status, body);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return extractGeminiText(payload);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type CallGeminiWithRetryResult = {
  text: string;
  modelUsed: string;
  attempts: number;
};

export async function callGeminiWithRetry(
  options: Omit<CallGeminiGenerateContentOptions, "model">,
): Promise<CallGeminiWithRetryResult> {
  const models = resolveGeminiModelsForCall();
  let lastError: Error | undefined;
  let totalAttempts = 0;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt += 1) {
      totalAttempts += 1;
      try {
        const text = await callGeminiGenerateContent({ ...options, model });
        return { text, modelUsed: model, attempts: totalAttempts };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const transient = isTransientGeminiError(lastError);
        const hasRetriesLeft = attempt < GEMINI_MAX_ATTEMPTS - 1;
        const hasFallbackModel = modelIndex < models.length - 1;

        if (transient && hasRetriesLeft) {
          const baseDelay = GEMINI_RETRY_DELAYS_MS[attempt] ?? 4000;
          const jitter = Math.floor(Math.random() * 200);
          await sleep(baseDelay + jitter);
          continue;
        }

        if (transient && hasFallbackModel) {
          break;
        }

        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Gemini API call failed.");
}
