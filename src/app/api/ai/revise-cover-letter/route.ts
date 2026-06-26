import { NextResponse } from "next/server";

import { InvalidModelTierError, parseModelTier } from "@/lib/ai/model-tiers";
import { reviseCoverLetterWithAI } from "@/lib/ai/revise-cover-letter-provider";
import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import { buildResumeConsistencyContext } from "@/lib/cover-letter/resume-evidence";
import {
  coverLetterRevisionShouldPersist,
  validateCoverLetterRevisionRequest,
} from "@/lib/cover-letter/revision-client";
import {
  getGeneratedCoverLetterDraftForUser,
  updateGeneratedCoverLetterDraftInCloudForUser,
} from "@/lib/supabase/generated-cover-letter-drafts";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { getJobDescriptionForUser } from "@/lib/supabase/job-descriptions";
import {
  createSupabaseClientWithAccessToken,
  getAccessTokenFromRequest,
  getAuthenticatedUserId,
} from "@/lib/supabase/server-client";
import type { CoverLetterRevisionRequest } from "@/types/cover-letter-draft";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();

  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Authorization required." }, { status: 401 });
    }

    const userId = await getAuthenticatedUserId(accessToken);
    const supabase = createSupabaseClientWithAccessToken(accessToken);
    const body = (await request.json()) as CoverLetterRevisionRequest;
    const validationError = validateCoverLetterRevisionRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    let coverLetterModelTier;
    try {
      coverLetterModelTier = parseModelTier(body.coverLetterModelTier);
    } catch (error) {
      if (error instanceof InvalidModelTierError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const draft = await getGeneratedCoverLetterDraftForUser(supabase, body.draftId, userId);
    if (!draft) {
      return NextResponse.json({ error: "Cover letter draft not found." }, { status: 404 });
    }

    const resumeDraft = draft.resumeDraftId
      ? await getGeneratedResumeDraftForUser(supabase, draft.resumeDraftId, userId)
      : null;
    const job = draft.jobDescriptionId
      ? await getJobDescriptionForUser(supabase, draft.jobDescriptionId, userId)
      : null;

    const { data: profileRow } = await supabase
      .from("application_communication_profiles")
      .select("content")
      .eq("user_id", userId)
      .maybeSingle();

    const companyDisplayName = normalizeCompanyDisplayName(
      draft.companyName ?? job?.companyName ?? draft.companyContext?.companyName ?? "",
    );

    const candidateName = resumeDraft?.content.header.fullName?.trim() || undefined;

    const revision = await reviseCoverLetterWithAI(
      {
        currentBody: body.currentBody,
        action: body.action,
        customInstruction: body.customInstruction,
        companyDisplayName,
        roleTitle: job?.roleTitle,
        candidateName,
        resumeEvidenceSpine:
          draft.rationale?.storySpinePrompt ??
          (resumeDraft ? buildResumeConsistencyContext(resumeDraft) : undefined),
        communicationProfile:
          typeof profileRow?.content === "string" ? profileRow.content : undefined,
        additionalInstructions: draft.additionalInstructions,
      },
      process.env.AI_PROVIDER,
      { modelTier: coverLetterModelTier },
    );

    const shouldPersist = coverLetterRevisionShouldPersist(body);

    if (shouldPersist) {
      const updated = await updateGeneratedCoverLetterDraftInCloudForUser(
        supabase,
        draft.id,
        userId,
        {
          body: revision.body,
          modelName: revision.modelName,
          rationale: draft.rationale
            ? {
                ...draft.rationale,
                wordCount: revision.wordCount,
                modelSelection: {
                  requestedTier: coverLetterModelTier,
                  fallbackApplied: revision.modelFallbackApplied,
                },
              }
            : undefined,
        },
      );

      if (!updated) {
        return NextResponse.json({ error: "Failed to save revised cover letter." }, { status: 500 });
      }
    }

    return NextResponse.json({
      body: revision.body,
      wordCount: revision.wordCount,
      warnings: revision.warnings,
      provider: revision.provider,
      isMock: revision.isMock,
      providerLabel: revision.providerLabel,
      modelName: revision.modelName,
      requestedModelTier: coverLetterModelTier,
      modelFallbackApplied: revision.modelFallbackApplied,
      persisted: shouldPersist,
      timestamp,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cover letter revision failed.",
        timestamp,
      },
      { status: 500 },
    );
  }
}
