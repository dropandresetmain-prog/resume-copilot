export function parseResumeSummaryCustomRevisionJson(rawText: string): {
  ok: boolean;
  value?: { text: string; warnings: string[] };
  error?: string;
} {
  try {
    const candidate = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? rawText.trim();
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
    if (!text) {
      return { ok: false, error: "Missing revised summary text." };
    }
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === "string")
      : [];
    return { ok: true, value: { text, warnings } };
  } catch {
    return { ok: false, error: "Invalid summary revision JSON." };
  }
}
