import type { EvidenceItem, EvidenceSpineResult } from "@/lib/evidence/types";
import type { CompanyContext } from "@/types/company-context";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

const MAX_PROOF_STORIES = 3;
const MAX_SUPPORTING_SIGNALS = 5;

export type CoverLetterProofStory = {
  evidenceId: string;
  label: string;
  rationale: string;
  sourceType: EvidenceItem["sourceType"];
  groundedText: string;
  onResumeDraft: boolean;
};

export type CoverLetterStorySpine = {
  positioningAngle: string;
  whyThisRole: string;
  whyThisCompany: string;
  proofStories: CoverLetterProofStory[];
  supportingSignals: string[];
  honestGaps: string[];
  avoidOverclaim: string[];
  resumeConsistencyNotes: string[];
  evidenceNotToUse: string[];
};

export type BuildCoverLetterStorySpineOptions = {
  spine: EvidenceSpineResult;
  companyContext?: CompanyContext;
  resumeDraft: GeneratedResumeDraftRecord;
  jdText: string;
  roleTitle?: string;
  companyDisplayName?: string;
};

function normalizeEvidenceText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+&/-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function groundedEvidenceText(item: EvidenceItem): string {
  return (item.acceptedWording ?? item.editedText ?? item.originalText).trim();
}

function buildResumeDraftTextSet(draft: GeneratedResumeDraftRecord): Set<string> {
  const texts = new Set<string>();
  for (const experience of draft.content.experience) {
    for (const bullet of experience.bullets) {
      const text = bullet.text?.trim();
      if (text) {
        texts.add(normalizeEvidenceText(text));
      }
    }
  }
  for (const item of draft.content.additionalExperience) {
    const text = item.text?.trim();
    if (text) {
      texts.add(normalizeEvidenceText(text));
    }
  }
  return texts;
}

function isOnResumeDraft(item: EvidenceItem, resumeTexts: ReadonlySet<string>): boolean {
  const grounded = normalizeEvidenceText(groundedEvidenceText(item));
  if (!grounded) {
    return false;
  }
  if (resumeTexts.has(grounded)) {
    return true;
  }
  for (const resumeText of resumeTexts) {
    if (
      resumeText.length >= 24 &&
      (resumeText.includes(grounded) || grounded.includes(resumeText))
    ) {
      return true;
    }
  }
  return false;
}

function isProofEligible(item: EvidenceItem): boolean {
  return (
    item.eligibility !== "positioning_only" &&
    item.sourceType !== "keyword_tied" &&
    item.state !== "excluded" &&
    item.state !== "hidden"
  );
}

function toProofStory(item: EvidenceItem, onResumeDraft: boolean): CoverLetterProofStory {
  return {
    evidenceId: item.id,
    label: item.displayLabel,
    rationale: item.rationale,
    sourceType: item.sourceType,
    groundedText: groundedEvidenceText(item),
    onResumeDraft,
  };
}

function buildWhyThisRole(jdText: string, roleTitle: string | undefined, spine: EvidenceSpineResult): string {
  const role = roleTitle?.trim() || spine.positioningAngle;
  const topSignals = spine.selected
    .flatMap((item) => item.matchedJdSignals)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);
  if (topSignals.length > 0) {
    return `This ${roleTitle?.trim() || "role"} needs ${topSignals.join(", ")} — lead with inventory proof that matches those signals.`;
  }
  const jdSnippet = jdText.trim().slice(0, 160);
  return jdSnippet
    ? `Frame the hiring argument around the JD's core asks: ${jdSnippet}${jdText.length > 160 ? "…" : ""}`
    : `Frame the hiring argument around transferable outcomes most relevant to ${role}.`;
}

function buildWhyThisCompany(
  companyContext: CompanyContext | undefined,
  companyDisplayName: string | undefined,
): string {
  const company = companyDisplayName?.trim() || companyContext?.displayName?.trim() || "this company";
  const priorities = (companyContext?.likelyHiringPriorities ?? []).slice(0, 2);
  if (priorities.length > 0) {
    return `Use company context for framing only: ${company} appears to prioritize ${priorities.join(" and ")}. Tie each claim to inventory evidence — do not treat context as proof.`;
  }
  return `Use company context for positioning at ${company} only — claims must stay inventory-backed.`;
}

function buildAvoidOverclaim(
  spine: EvidenceSpineResult,
  companyContext: CompanyContext | undefined,
): string[] {
  const notes = [
    ...spine.storyInputs.avoidOverclaimNotes,
    "Company context and narrative angles are framing only unless supported by inventory evidence.",
    "Keyword bank terms are advisory unless tied to a proof story.",
  ];
  if (companyContext?.limitations?.length) {
    notes.push(`Company research limitations: ${companyContext.limitations.join("; ")}`);
  }
  return [...new Set(notes.map((note) => note.trim()).filter(Boolean))].slice(0, 6);
}

function buildEvidenceNotToUse(spine: EvidenceSpineResult): string[] {
  const omitted = spine.omitted
    .filter(
      (item) =>
        item.state === "excluded" ||
        item.eligibility === "positioning_only" ||
        item.sourceType === "keyword_tied" ||
        item.confidence === "low",
    )
    .map((item) => `${item.displayLabel}: ${item.rationale}`);
  return omitted.slice(0, 8);
}

function buildResumeConsistencyNotes(
  proofStories: readonly CoverLetterProofStory[],
  resumeTexts: ReadonlySet<string>,
): string[] {
  const notes: string[] = [];
  const offResume = proofStories.filter((story) => !story.onResumeDraft);
  const onResume = proofStories.filter((story) => story.onResumeDraft);

  if (offResume.length > 0) {
    notes.push(
      `Strong inventory proof not on the resume draft — cover letter may use: ${offResume.map((story) => story.label).join("; ")}.`,
    );
  }
  if (onResume.length > 0) {
    notes.push(
      `Align cover letter claims with resume draft wording for: ${onResume.map((story) => story.label).join("; ")}.`,
    );
  }
  if (resumeTexts.size === 0) {
    notes.push("Resume draft has little experience text — rely on inventory story spine for proof.");
  }
  return notes;
}

function selectProofStories(
  spine: EvidenceSpineResult,
  resumeTexts: ReadonlySet<string>,
): CoverLetterProofStory[] {
  const proofStories: CoverLetterProofStory[] = [];
  const usedIds = new Set<string>();

  const addStory = (item: EvidenceItem | undefined) => {
    if (!item || proofStories.length >= MAX_PROOF_STORIES || usedIds.has(item.id)) {
      return;
    }
    if (!isProofEligible(item)) {
      return;
    }
    proofStories.push(toProofStory(item, isOnResumeDraft(item, resumeTexts)));
    usedIds.add(item.id);
  };

  for (const snapshot of spine.storyInputs.omittedButRelevant) {
    addStory(spine.ranked.find((item) => item.id === snapshot.id));
    if (proofStories.length >= MAX_PROOF_STORIES) {
      return proofStories;
    }
  }

  for (const item of spine.ranked) {
    addStory(item);
    if (proofStories.length >= MAX_PROOF_STORIES) {
      break;
    }
  }

  return proofStories;
}

function buildSupportingSignals(
  spine: EvidenceSpineResult,
  proofStories: readonly CoverLetterProofStory[],
): string[] {
  const proofIds = new Set(proofStories.map((story) => story.evidenceId));
  const signals: string[] = [];

  for (const item of spine.ranked) {
    if (proofIds.has(item.id)) {
      continue;
    }
    if (item.sourceType === "skill" && item.eligibility !== "positioning_only") {
      signals.push(`${item.displayLabel} — supporting signal only, not standalone proof.`);
    } else if (item.sourceType === "keyword_tied") {
      signals.push(`Advisory keyword: ${item.originalText} (evidence-tied).`);
    } else if (
      item.eligibility === "positioning_only" &&
      item.sourceType === "company_context"
    ) {
      signals.push(`${item.displayLabel} — framing only.`);
    }
    if (signals.length >= MAX_SUPPORTING_SIGNALS) {
      break;
    }
  }

  return signals;
}

export function buildCoverLetterStorySpine(
  options: BuildCoverLetterStorySpineOptions,
): CoverLetterStorySpine {
  const resumeTexts = buildResumeDraftTextSet(options.resumeDraft);
  const proofStories = selectProofStories(options.spine, resumeTexts);
  const roleTitle =
    options.roleTitle?.trim() ||
    options.resumeDraft.content.targetRoleTitle?.trim() ||
    undefined;

  return {
    positioningAngle: options.spine.positioningAngle,
    whyThisRole: buildWhyThisRole(options.jdText, roleTitle, options.spine),
    whyThisCompany: buildWhyThisCompany(options.companyContext, options.companyDisplayName),
    proofStories,
    supportingSignals: buildSupportingSignals(options.spine, proofStories),
    honestGaps: options.spine.honestGaps,
    avoidOverclaim: buildAvoidOverclaim(options.spine, options.companyContext),
    resumeConsistencyNotes: buildResumeConsistencyNotes(proofStories, resumeTexts),
    evidenceNotToUse: buildEvidenceNotToUse(options.spine),
  };
}

export function formatStorySpineForPrompt(storySpine: CoverLetterStorySpine): string {
  const lines: string[] = [
    "## Inventory story spine (primary evidence universe)",
    "Use inventory-backed proof stories below — not the resume draft alone.",
    "",
    `Positioning angle: ${storySpine.positioningAngle}`,
    `Why this role: ${storySpine.whyThisRole}`,
    `Why this company (framing only): ${storySpine.whyThisCompany}`,
  ];

  if (storySpine.proofStories.length > 0) {
    lines.push("", "### Proof stories (inventory-backed)");
    for (const [index, story] of storySpine.proofStories.entries()) {
      const resumeNote = story.onResumeDraft
        ? "also on resume draft — keep wording consistent"
        : "NOT on resume draft — strong cover-letter-only proof";
      lines.push(
        [
          `Story ${index + 1} [${story.sourceType}] ${story.label} (${resumeNote})`,
          `Evidence id: ${story.evidenceId}`,
          `Grounded text: ${story.groundedText}`,
          `Rationale: ${story.rationale}`,
        ].join("\n"),
      );
      lines.push("");
    }
  } else {
    lines.push("", "(No inventory proof stories ranked — use resume consistency section conservatively.)");
  }

  if (storySpine.supportingSignals.length > 0) {
    lines.push("### Supporting signals (advisory / framing)");
    for (const signal of storySpine.supportingSignals) {
      lines.push(`- ${signal}`);
    }
  }

  if (storySpine.honestGaps.length > 0) {
    lines.push("", "### Honest gaps");
    for (const gap of storySpine.honestGaps) {
      lines.push(`- ${gap}`);
    }
  }

  if (storySpine.avoidOverclaim.length > 0) {
    lines.push("", "### Avoid overclaim");
    for (const note of storySpine.avoidOverclaim) {
      lines.push(`- ${note}`);
    }
  }

  if (storySpine.evidenceNotToUse.length > 0) {
    lines.push("", "### Evidence not to use");
    for (const item of storySpine.evidenceNotToUse) {
      lines.push(`- ${item}`);
    }
  }

  if (storySpine.resumeConsistencyNotes.length > 0) {
    lines.push("", "### Resume consistency notes");
    for (const note of storySpine.resumeConsistencyNotes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join("\n").trim();
}
