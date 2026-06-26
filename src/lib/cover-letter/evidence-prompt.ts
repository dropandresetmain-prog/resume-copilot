import {
  buildCoverLetterStorySpine,
  formatStorySpineForPrompt,
  type CoverLetterStorySpine,
} from "@/lib/evidence/story-spine";
import { buildEvidenceSpine } from "@/lib/evidence/spine";
import {
  buildResumeConsistencyContext,
  buildResumeEvidenceSpine,
} from "@/lib/cover-letter/resume-evidence";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
import { buildAcceptedWordingByBulletKey } from "@/lib/resume-draft/enrichment-wording";
import { MAX_RESUME_DRAFT_BULLETS } from "@/lib/resume-draft/payload";
import type { CompanyContext } from "@/types/company-context";
import type { CoverLetterEvidenceControls } from "@/types/cover-letter-draft";
import type { StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export type CoverLetterEvidencePromptResult = {
  resumeEvidenceSpine: string;
  storySpine?: CoverLetterStorySpine;
};

export function buildCoverLetterEvidencePrompt(options: {
  inventory?: InventoryState;
  resumeDraft: GeneratedResumeDraftRecord;
  job: StoredJobDescription;
  companyContext: CompanyContext;
  companyDisplayName?: string;
  evidenceControls?: CoverLetterEvidenceControls;
}): CoverLetterEvidencePromptResult {
  if (!options.inventory) {
    return {
      resumeEvidenceSpine: buildResumeEvidenceSpine(options.resumeDraft, {
        jobDescriptionText: options.job.rawText,
        roleTitle: options.job.roleTitle ?? options.resumeDraft.content.targetRoleTitle,
        hiringPriorities: options.companyContext.likelyHiringPriorities,
      }),
    };
  }

  const collated = buildActiveCollatedInventory(options.inventory);
  const acceptedWordingByBulletKey = buildAcceptedWordingByBulletKey(options.inventory.enrichment);
  const spine = buildEvidenceSpine({
    collated,
    enrichment: options.inventory.enrichment,
    jdText: options.job.rawText,
    roleTitle: options.job.roleTitle ?? options.resumeDraft.content.targetRoleTitle,
    maxWorkBullets: MAX_RESUME_DRAFT_BULLETS,
    regenerationControls: options.resumeDraft.inputSnapshot?.regenerationControls,
    companyContext: options.companyContext,
    acceptedWordingByBulletKey,
  });
  const storySpine = buildCoverLetterStorySpine({
    spine,
    companyContext: options.companyContext,
    resumeDraft: options.resumeDraft,
    jdText: options.job.rawText,
    roleTitle: options.job.roleTitle,
    companyDisplayName: options.companyDisplayName,
    evidenceControls: options.evidenceControls,
  });

  return {
    storySpine,
    resumeEvidenceSpine: [
      formatStorySpineForPrompt(storySpine),
      buildResumeConsistencyContext(options.resumeDraft),
    ].join("\n\n"),
  };
}
