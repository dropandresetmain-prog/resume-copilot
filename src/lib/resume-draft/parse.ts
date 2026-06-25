import { repairBulletText } from "@/lib/resume-draft/keyword-repair";
import { parseStoredExportLayoutSettings } from "@/lib/resume-draft/export-layout-settings";
import {
  RESUME_DRAFT_SCHEMA_VERSION,
  type ResumeDraftConfidence,
  type ResumeDraftContent,
  type ResumeDraftGenerationResult,
  type ResumeDraftRationale,
} from "@/types/resume-draft";

export type ParsedResumeDraftPayload = {
  content: ResumeDraftContent;
  rationale: ResumeDraftRationale;
};

export type ParseResumeDraftJsonResult =
  | { ok: true; value: ParsedResumeDraftPayload }
  | { ok: false; error: string; rawText: string };

export class ResumeDraftParseError extends Error {
  readonly rawModelResponse: string;

  constructor(message: string, rawModelResponse: string) {
    super(message);
    this.name = "ResumeDraftParseError";
    this.rawModelResponse = rawModelResponse;
  }
}

export function extractJsonCandidate(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? text.trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asConfidence(value: unknown): ResumeDraftConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function mapSourceRefs(value: unknown) {
  if (!Array.isArray(value)) return [];
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

function mapSelectionAudit(value: unknown) {
  if (!isObject(value)) {
    return undefined;
  }

  return {
    jdThemes: asStringArray(value.jdThemes),
    strongestMatches: asStringArray(value.strongestMatches),
    honestGaps: asStringArray(value.honestGaps),
    positioningAngle: asString(value.positioningAngle),
    roleSelectionRationale: asString(value.roleSelectionRationale),
    selectedBulletKeys: asStringArray(value.selectedBulletKeys),
    acceptedWordingUsed: asStringArray(value.acceptedWordingUsed),
    approvedKeywordsUsed: asStringArray(value.approvedKeywordsUsed),
    approvedKeywordsSkipped: asStringArray(value.approvedKeywordsSkipped),
  };
}

function mapRationale(value: unknown): ResumeDraftRationale {
  if (!isObject(value)) {
    return {
      overall: "Resume draft generated from inventory and job description.",
      omissions: [],
      keywordUsage: [],
    };
  }

  const selectionAudit = mapSelectionAudit(value.selectionAudit);

  return {
    overall:
      asString(value.overall) ??
      "Resume draft generated from inventory and job description.",
    toneNotes: asString(value.toneNotes),
    omissions: asStringArray(value.omissions),
    keywordUsage: asStringArray(value.keywordUsage),
    selectionAudit:
      selectionAudit &&
      (selectionAudit.jdThemes.length > 0 ||
        (selectionAudit.strongestMatches?.length ?? 0) > 0 ||
        (selectionAudit.honestGaps?.length ?? 0) > 0 ||
        Boolean(selectionAudit.positioningAngle) ||
        Boolean(selectionAudit.roleSelectionRationale) ||
        selectionAudit.selectedBulletKeys.length > 0 ||
        selectionAudit.acceptedWordingUsed.length > 0 ||
        selectionAudit.approvedKeywordsUsed.length > 0 ||
        selectionAudit.approvedKeywordsSkipped.length > 0)
        ? selectionAudit
        : undefined,
  };
}

export function mapResumeDraftPayload(parsed: unknown): ResumeDraftGenerationResult {
  if (!isObject(parsed)) {
    throw new Error("Model response was not a JSON object.");
  }

  const rationaleSource = parsed.rationale ?? parsed;
  const rationale = mapRationale(rationaleSource);

  const summary = isObject(parsed.professionalSummary)
    ? parsed.professionalSummary
    : {};
  const skills = isObject(parsed.skills) ? parsed.skills : {};
  const header = isObject(parsed.header) ? parsed.header : {};

  const experience = Array.isArray(parsed.experience)
    ? parsed.experience.filter(isObject).map((entry) => ({
        company: asString(entry.company) ?? "Unknown company",
        companyDescriptor: asString(entry.companyDescriptor),
        role: asString(entry.role) ?? "Unknown role",
        location: asString(entry.location),
        dateRange: asString(entry.dateRange),
        bullets: Array.isArray(entry.bullets)
          ? entry.bullets.filter(isObject).map((bullet) => ({
              text: repairBulletText(asString(bullet.text) ?? ""),
              sourceRefs: mapSourceRefs(bullet.sourceRefs),
              jdAlignmentReason: asString(bullet.jdAlignmentReason),
              confidence: asConfidence(bullet.confidence),
              riskFlags: asStringArray(bullet.riskFlags),
            }))
          : [],
        riskFlags: asStringArray(entry.riskFlags),
      }))
    : [];

  const education = Array.isArray(parsed.education)
    ? parsed.education.filter(isObject).map((entry) => ({
        institution: asString(entry.institution) ?? "Unknown institution",
        location: asString(entry.location),
        programmes: asStringArray(entry.programmes),
        dateRange: asString(entry.dateRange),
        bullets: asStringArray(entry.bullets),
        riskFlags: asStringArray(entry.riskFlags),
      }))
    : [];

  const additionalExperience = Array.isArray(parsed.additionalExperience)
    ? parsed.additionalExperience.filter(isObject).map((entry) => ({
        category: asString(entry.category),
        text: asString(entry.text) ?? "",
        riskFlags: asStringArray(entry.riskFlags),
      }))
    : [];

  const content: ResumeDraftContent = {
    schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
    targetRoleTitle: asString(parsed.targetRoleTitle),
    header: {
      fullName: asString(header.fullName),
      location: asString(header.location),
      email: asString(header.email),
      phone: asString(header.phone),
      linkedin: asString(header.linkedin),
      includeHeader:
        typeof header.includeHeader === "boolean" ? header.includeHeader : false,
      notes: asString(header.notes),
    },
    professionalSummary: {
      text: asString(summary.text) ?? "",
      jdAlignment: asStringArray(summary.jdAlignment),
      riskFlags: asStringArray(summary.riskFlags),
    },
    skills: {
      groups: Array.isArray(skills.groups)
        ? skills.groups.filter(isObject).map((group) => ({
            label: asString(group.label) ?? "Skills",
            items: asStringArray(group.items),
          }))
        : [],
      jdAlignment: asStringArray(skills.jdAlignment),
      riskFlags: asStringArray(skills.riskFlags),
    },
    experience,
    education,
    additionalExperience,
    globalRiskFlags: asStringArray(parsed.globalRiskFlags),
    exportLayoutSettings: parseStoredExportLayoutSettings(parsed.exportLayoutSettings),
  };

  const hasUsableContent =
    content.experience.length > 0 ||
    content.education.length > 0 ||
    content.skills.groups.some((group) => group.items.length > 0);

  if (!hasUsableContent) {
    throw new Error("Model response did not contain usable resume draft content.");
  }

  return { content, rationale };
}

export function parseResumeDraftJson(text: string): ParseResumeDraftJsonResult {
  try {
    const candidate = extractJsonCandidate(text);
    const parsed: unknown = JSON.parse(candidate);
    const mapped = mapResumeDraftPayload(parsed);
    return { ok: true, value: mapped };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON from model.",
      rawText: text,
    };
  }
}
