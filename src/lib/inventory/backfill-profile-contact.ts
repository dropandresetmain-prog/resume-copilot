/**
 * Safe backfill of profile/contact onto existing parsed resumes.
 * Uses preserved unparsed/preamble text only — never re-parses the full resume.
 */

import {
  isConfidentProfileContact,
  looksLikePersonNameHeader,
  parseProfileContact,
} from "@/lib/parser/profile-contact";
import type {
  InventoryState,
  ParsedResume,
  ParsedUnparsedSection,
} from "@/types/resume";

export type ProfileContactBackfillSummary = {
  resumesChecked: number;
  profilesAdded: number;
  skippedAlreadyHadProfile: number;
  skippedNoSourceText: number;
  warningsRemoved: number;
  filenamesUpdated: string[];
};

type ProfileSourceCandidate = {
  lines: string[];
  sectionIdsToRemove: string[];
  warningsToRemove: string[];
};

const PREAMBLE_WARNING = "Content found before the first section header.";

function unknownSectionWarning(section: ParsedUnparsedSection): string {
  return `Unknown section "${section.originalHeader}" preserved as unparsed.`;
}

function buildSourceCandidates(resume: ParsedResume): ProfileSourceCandidate[] {
  const candidates: ProfileSourceCandidate[] = [];

  for (const section of resume.unparsedSections) {
    if (section.title === "Document preamble") {
      const lines = section.lines.map((line) => line.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      candidates.push({
        lines,
        sectionIdsToRemove: [section.id],
        warningsToRemove: [PREAMBLE_WARNING],
      });
      continue;
    }

    if (looksLikePersonNameHeader(section.title)) {
      const lines = [section.title, ...section.lines]
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      candidates.push({
        lines,
        sectionIdsToRemove: [section.id],
        warningsToRemove: [unknownSectionWarning(section)],
      });
    }
  }

  return candidates;
}

function pickBestProfileSource(
  candidates: ProfileSourceCandidate[],
): { profile: NonNullable<ReturnType<typeof parseProfileContact>>; source: ProfileSourceCandidate } | null {
  for (const source of candidates) {
    const profile = parseProfileContact(source.lines);
    if (isConfidentProfileContact(profile)) {
      return { profile, source };
    }
  }

  return null;
}

type ResumeBackfillResult =
  | { kind: "skipped-has-profile" }
  | { kind: "skipped-no-source" }
  | {
      kind: "updated";
      resume: ParsedResume;
      warningsRemoved: number;
    };

function backfillProfileContactForResume(resume: ParsedResume): ResumeBackfillResult {
  if (resume.profile?.fullName?.trim()) {
    return { kind: "skipped-has-profile" };
  }

  const candidates = buildSourceCandidates(resume);
  const picked = pickBestProfileSource(candidates);
  if (!picked) {
    return { kind: "skipped-no-source" };
  }

  const sectionIds = new Set(picked.source.sectionIdsToRemove);
  const warningsToRemove = new Set(picked.source.warningsToRemove);
  const unparsedSections = resume.unparsedSections.filter(
    (section) => !sectionIds.has(section.id),
  );
  const parseWarnings = resume.parseWarnings.filter(
    (warning) => !warningsToRemove.has(warning),
  );

  const warningsRemoved =
    resume.unparsedSections.length -
    unparsedSections.length +
    (resume.parseWarnings.length - parseWarnings.length);

  return {
    kind: "updated",
    resume: {
      ...resume,
      profile: picked.profile,
      unparsedSections,
      parseWarnings,
    },
    warningsRemoved,
  };
}

export function createEmptyProfileContactBackfillSummary(): ProfileContactBackfillSummary {
  return {
    resumesChecked: 0,
    profilesAdded: 0,
    skippedAlreadyHadProfile: 0,
    skippedNoSourceText: 0,
    warningsRemoved: 0,
    filenamesUpdated: [],
  };
}

/**
 * Add missing profile/contact from preserved header text only.
 * Does not mutate experiences, education, skills, enrichment, or keyword bank.
 */
export function backfillProfileContactForInventory(inventory: InventoryState): {
  inventory: InventoryState;
  changed: boolean;
  summary: ProfileContactBackfillSummary;
} {
  const summary = createEmptyProfileContactBackfillSummary();
  let changed = false;
  const resumes: ParsedResume[] = [];

  for (const resume of inventory.resumes) {
    summary.resumesChecked += 1;
    const result = backfillProfileContactForResume(resume);

    if (result.kind === "skipped-has-profile") {
      summary.skippedAlreadyHadProfile += 1;
      resumes.push(resume);
      continue;
    }

    if (result.kind === "skipped-no-source") {
      summary.skippedNoSourceText += 1;
      resumes.push(resume);
      continue;
    }

    changed = true;
    summary.profilesAdded += 1;
    summary.warningsRemoved += result.warningsRemoved;
    summary.filenamesUpdated.push(resume.filename);
    resumes.push(result.resume);
  }

  if (!changed) {
    return { inventory, changed: false, summary };
  }

  return {
    inventory: {
      ...inventory,
      resumes,
    },
    changed: true,
    summary,
  };
}
