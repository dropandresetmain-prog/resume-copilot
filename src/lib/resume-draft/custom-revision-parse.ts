export function parseResumeSingleBulletRevisionJson(rawText: string): {
  ok: boolean;
  value?: {
    bullets: { roleIndex: number; bulletIndex: number; text: string }[];
    warnings: string[];
  };
  error?: string;
} {
  try {
    const candidate = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? rawText.trim();
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const rawBullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];
    const bullets = rawBullets
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const roleIndex = typeof record.roleIndex === "number" ? record.roleIndex : NaN;
        const bulletIndex = typeof record.bulletIndex === "number" ? record.bulletIndex : NaN;
        const text = typeof record.text === "string" ? record.text.trim() : "";
        if (!Number.isInteger(roleIndex) || !Number.isInteger(bulletIndex) || !text) {
          return null;
        }
        return { roleIndex, bulletIndex, text };
      })
      .filter((entry): entry is { roleIndex: number; bulletIndex: number; text: string } =>
        entry !== null,
      );
    if (bullets.length === 0) {
      return { ok: false, error: "No revised bullets returned." };
    }
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === "string")
      : [];
    return { ok: true, value: { bullets, warnings } };
  } catch {
    return { ok: false, error: "Invalid single-bullet revision JSON." };
  }
}

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
