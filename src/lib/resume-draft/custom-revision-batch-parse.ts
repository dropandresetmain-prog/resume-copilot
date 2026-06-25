import type { ResumeDraftExperienceBullet } from "@/types/resume-draft";
import { repairBulletText } from "@/lib/resume-draft/keyword-repair";
import type { ResumeDraftConfidence } from "@/types/resume-draft";

export type ResumeBatchRevisionRawResult = {
  summaryCandidate?: { text: string } | null;
  roleCandidates?: Array<{
    roleIndex: number;
    company: string;
    role: string;
    bullets: ResumeDraftExperienceBullet[];
  }>;
  warnings: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asConfidence(value: unknown): ResumeDraftConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function mapSourceRefs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isObject)
    .map((ref) => ({
      collatedBulletId: asString(ref.collatedBulletId),
      bulletKey: asString(ref.bulletKey),
      resumeId: asString(ref.resumeId),
      filename: asString(ref.filename),
    }))
    .filter(
      (ref) =>
        ref.collatedBulletId || ref.bulletKey || ref.resumeId || ref.filename,
    );
}

function mapBullets(value: unknown): ResumeDraftExperienceBullet[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isObject).map((bullet) => ({
    text: repairBulletText(asString(bullet.text) ?? ""),
    sourceRefs: mapSourceRefs(bullet.sourceRefs),
    jdAlignmentReason: asString(bullet.jdAlignmentReason),
    confidence: asConfidence(bullet.confidence),
    riskFlags: asStringArray(bullet.riskFlags),
  }));
}

export function parseResumeBatchRevisionJson(rawText: string): {
  ok: boolean;
  value?: ResumeBatchRevisionRawResult;
  error?: string;
} {
  try {
    const candidate =
      rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? rawText.trim();
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const warnings = asStringArray(parsed.warnings);

    let summaryCandidate: { text: string } | null | undefined;
    if (parsed.summaryCandidate === null) {
      summaryCandidate = null;
    } else if (isObject(parsed.summaryCandidate)) {
      const text = asString(parsed.summaryCandidate.text);
      summaryCandidate = text ? { text } : undefined;
    }

    const roleCandidates = Array.isArray(parsed.roleCandidates)
      ? parsed.roleCandidates
          .filter(isObject)
          .map((entry) => ({
            roleIndex:
              typeof entry.roleIndex === "number" ? entry.roleIndex : Number.NaN,
            company: asString(entry.company) ?? "",
            role: asString(entry.role) ?? "",
            bullets: mapBullets(entry.bullets),
          }))
          .filter((entry) => Number.isInteger(entry.roleIndex) && entry.roleIndex >= 0)
      : [];

    return {
      ok: true,
      value: {
        summaryCandidate,
        roleCandidates,
        warnings,
      },
    };
  } catch {
    return { ok: false, error: "Invalid batch revision JSON." };
  }
}
