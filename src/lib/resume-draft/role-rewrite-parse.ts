import { repairBulletText } from "@/lib/resume-draft/keyword-repair";
import type {
  ResumeDraftConfidence,
  ResumeDraftExperienceBullet,
} from "@/types/resume-draft";

export class ResumeRoleRewriteParseError extends Error {
  readonly rawModelResponse: string;

  constructor(message: string, rawModelResponse: string) {
    super(message);
    this.name = "ResumeRoleRewriteParseError";
    this.rawModelResponse = rawModelResponse;
  }
}

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

export function parseResumeRoleRewriteJson(rawText: string): {
  bullets: ResumeDraftExperienceBullet[];
  notes?: string;
} {
  const candidate = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? rawText.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new ResumeRoleRewriteParseError("Role rewrite response was not valid JSON.", rawText);
  }

  if (!isObject(parsed) || !Array.isArray(parsed.bullets)) {
    throw new ResumeRoleRewriteParseError("Role rewrite response missing bullets array.", rawText);
  }

  const bullets = parsed.bullets.filter(isObject).map((bullet) => ({
    text: repairBulletText(asString(bullet.text) ?? ""),
    sourceRefs: mapSourceRefs(bullet.sourceRefs),
    jdAlignmentReason: asString(bullet.jdAlignmentReason),
    confidence: asConfidence(bullet.confidence),
    riskFlags: asStringArray(bullet.riskFlags),
  }));

  if (bullets.length === 0) {
    throw new ResumeRoleRewriteParseError("Role rewrite returned no bullets.", rawText);
  }

  return {
    bullets,
    notes: asString(parsed.notes),
  };
}
