import { countWords } from "@/lib/cover-letter/resume-evidence";
import type { CoverLetterGenerationResult, CoverLetterRationale } from "@/types/cover-letter-draft";

export class CoverLetterParseError extends Error {
  rawText?: string;

  constructor(message: string, rawText?: string) {
    super(message);
    this.name = "CoverLetterParseError";
    this.rawText = rawText;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseCoverLetterJson(rawText: string): {
  ok: true;
  value: CoverLetterGenerationResult;
} | {
  ok: false;
  error: string;
  rawText: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "Model response was not valid JSON.", rawText };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: "Model response JSON must be an object.", rawText };
  }

  const formal = parsed.formalCoverLetter;
  if (!isObject(formal) || typeof formal.content !== "string" || !formal.content.trim()) {
    return { ok: false, error: "Missing formalCoverLetter.content.", rawText };
  }

  const rationaleRaw = isObject(parsed.rationale) ? parsed.rationale : {};
  const formalContent = formal.content.trim();

  const rationale: CoverLetterRationale = {
    selectedThemes: Array.isArray(rationaleRaw.selectedThemes)
      ? rationaleRaw.selectedThemes.filter((item): item is string => typeof item === "string")
      : [],
    whyTheseThemes:
      typeof rationaleRaw.whyTheseThemes === "string" ? rationaleRaw.whyTheseThemes : "",
    companyContextUsed: Array.isArray(rationaleRaw.companyContextUsed)
      ? rationaleRaw.companyContextUsed.filter((item): item is string => typeof item === "string")
      : [],
    selectedCompanyFacts: readStringArray(rationaleRaw.selectedCompanyFacts),
    selectedRoleRequirements: readStringArray(rationaleRaw.selectedRoleRequirements),
    companyRoleStoryBridges: readStringArray(rationaleRaw.companyRoleStoryBridges),
    riskFlags: Array.isArray(rationaleRaw.riskFlags)
      ? rationaleRaw.riskFlags.filter((item): item is string => typeof item === "string")
      : [],
    wordCount: countWords(formalContent),
    emailCoverLetter: readSecondaryContent(parsed.emailCoverLetter),
    linkedinMessage: readSecondaryContent(parsed.linkedinMessage),
    recruiterDm: readSecondaryContent(parsed.recruiterDm),
    whatsappIntro: readSecondaryContent(parsed.whatsappIntro),
  };

  return {
    ok: true,
    value: {
      formalContent,
      rationale,
    },
  };
}

function readSecondaryContent(value: unknown): string {
  if (!isObject(value) || typeof value.content !== "string") {
    return "";
  }
  return value.content.trim();
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseCoverLetterJsonOrThrow(rawText: string): CoverLetterGenerationResult {
  const parsed = parseCoverLetterJson(rawText);
  if (!parsed.ok) {
    throw new CoverLetterParseError(parsed.error, parsed.rawText);
  }
  return parsed.value;
}
