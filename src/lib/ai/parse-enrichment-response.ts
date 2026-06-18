export type ParsedEnrichmentPayload = {
  suggestions: unknown[];
  duplicateGroups: unknown[];
};

export type ParseEnrichmentJsonResult =
  | { ok: true; value: ParsedEnrichmentPayload }
  | { ok: false; error: string; rawText: string };

export class EnrichmentParseError extends Error {
  readonly rawModelResponse: string;

  constructor(message: string, rawModelResponse: string) {
    super(message);
    this.name = "EnrichmentParseError";
    this.rawModelResponse = rawModelResponse;
  }
}

export function extractJsonCandidate(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? text.trim();
}

export function parseEnrichmentJson(text: string): ParseEnrichmentJsonResult {
  try {
    const candidate = extractJsonCandidate(text);
    const parsed: unknown = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        error: "Model response was not a JSON object.",
        rawText: text,
      };
    }

    const value = parsed as Record<string, unknown>;
    return {
      ok: true,
      value: {
        suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
        duplicateGroups: Array.isArray(value.duplicateGroups)
          ? value.duplicateGroups
          : [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON from model.",
      rawText: text,
    };
  }
}
