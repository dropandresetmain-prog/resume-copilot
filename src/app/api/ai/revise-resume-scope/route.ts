import { NextResponse } from "next/server";

import { InvalidModelTierError, parseModelTier } from "@/lib/ai/model-tiers";
import {
  getResumeCustomRevisionProviderLabel,
  reviseResumeBatchWithAI,
  reviseResumeScopeWithAI,
} from "@/lib/ai/revise-resume-scope-provider";
import { resolveDraftStatusAfterContentEdit } from "@/lib/resume-draft/apply-evidence-changes";
import {
  applyResumeCustomRevision,
  resumeCustomRevisionShouldPersist,
  validateCustomRevisedRoleBullets,
  validateResumeCustomRevisionRequest,
} from "@/lib/resume-draft/custom-revision";
import {
  applyResumeBatchRevision,
  batchRevisionHasCandidates,
  validateResumeBatchRevisionRequest,
} from "@/lib/resume-draft/custom-revision-batch";
import { ResumeRoleRewriteParseError } from "@/lib/resume-draft/role-rewrite-parse";
import {
  getGeneratedResumeDraftForUser,
  updateGeneratedResumeDraftInCloudForUser,
} from "@/lib/supabase/generated-resume-drafts";
import {
  createSupabaseClientWithAccessToken,
  getAccessTokenFromRequest,
  getAuthenticatedUserId,
} from "@/lib/supabase/server-client";
import type {
  ResumeBatchRevisionRequest,
  ResumeCustomRevisionRequest,
} from "@/types/resume-draft";

function isBatchRequest(
  body: ResumeCustomRevisionRequest | ResumeBatchRevisionRequest,
): body is ResumeBatchRevisionRequest {
  return Array.isArray((body as ResumeBatchRevisionRequest).queue);
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();

  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Authorization required." }, { status: 401 });
    }

    const userId = await getAuthenticatedUserId(accessToken);
    const supabase = createSupabaseClientWithAccessToken(accessToken);
    const body = (await request.json()) as ResumeCustomRevisionRequest | ResumeBatchRevisionRequest;

    if (isBatchRequest(body)) {
      return handleBatchRevision(body, supabase, userId, timestamp);
    }

    return handleSingleRevision(body, supabase, userId, timestamp);
  } catch (error) {
    if (error instanceof ResumeRoleRewriteParseError) {
      return NextResponse.json(
        {
          error: error.message,
          rawModelResponse: error.rawModelResponse,
          timestamp,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Resume custom revision failed.",
        timestamp,
      },
      { status: 500 },
    );
  }
}

async function handleSingleRevision(
  body: ResumeCustomRevisionRequest,
  supabase: ReturnType<typeof createSupabaseClientWithAccessToken>,
  userId: string,
  timestamp: string,
) {
  const validationError = validateResumeCustomRevisionRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let resumeModelTier;
  try {
    resumeModelTier = parseModelTier(body.resumeModelTier);
  } catch (error) {
    if (error instanceof InvalidModelTierError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const draft = await getGeneratedResumeDraftForUser(supabase, body.draftId, userId);
  if (!draft) {
    return NextResponse.json({ error: "Resume draft not found." }, { status: 404 });
  }

  const revisionInput =
    body.scope === "professional_summary"
      ? {
          scope: "professional_summary" as const,
          currentSummary: body.content.professionalSummary.text,
          customInstruction: body.customInstruction,
          jobDescriptionText: body.jobDescription.rawText,
          targetRoleTitle: body.jobDescription.roleTitle,
        }
      : {
          scope: "selected_role" as const,
          currentRole: body.content.experience[body.roleIndex!]!,
          customInstruction: body.customInstruction,
          jobDescriptionText: body.jobDescription.rawText,
          targetRoleTitle: body.jobDescription.roleTitle,
          bulletStyle: body.referenceResume?.bulletStyle,
        };

  const revision = await reviseResumeScopeWithAI(revisionInput, process.env.AI_PROVIDER, {
    modelTier: resumeModelTier,
  });

  const validationIssues: string[] = [];
  if (revision.scope === "selected_role") {
    validationIssues.push(
      ...validateCustomRevisedRoleBullets({
        bullets: revision.roleBullets,
        priorRole: body.content.experience[body.roleIndex!]!,
      }),
    );
  }

  if (validationIssues.length > 0) {
    return NextResponse.json(
      {
        error: "Resume custom revision failed validation.",
        validationIssues,
        timestamp,
      },
      { status: 422 },
    );
  }

  const shouldPersist = resumeCustomRevisionShouldPersist(body);

  if (shouldPersist) {
    const nextContent = applyResumeCustomRevision(draft.content, {
      scope: revision.scope,
      roleIndex: body.roleIndex,
      professionalSummaryText:
        revision.scope === "professional_summary" ? revision.professionalSummaryText : undefined,
      roleBullets: revision.scope === "selected_role" ? revision.roleBullets : undefined,
    });

    const updated = await updateGeneratedResumeDraftInCloudForUser(
      supabase,
      draft.id,
      userId,
      {
        content: nextContent,
        status: resolveDraftStatusAfterContentEdit(draft.status),
      },
    );

    if (!updated) {
      return NextResponse.json({ error: "Failed to save revised resume draft." }, { status: 500 });
    }
  }

  const provider = process.env.AI_PROVIDER ?? "mock";
  return NextResponse.json({
    scope: revision.scope,
    roleIndex: body.roleIndex,
    professionalSummaryText:
      revision.scope === "professional_summary" ? revision.professionalSummaryText : undefined,
    roleBullets: revision.scope === "selected_role" ? revision.roleBullets : undefined,
    warnings: revision.warnings,
    provider,
    isMock: provider === "mock",
    providerLabel: getResumeCustomRevisionProviderLabel(provider),
    modelName: revision.modelName,
    requestedModelTier: resumeModelTier,
    modelFallbackApplied: revision.modelFallbackApplied,
    persisted: shouldPersist,
    timestamp,
  });
}

async function handleBatchRevision(
  body: ResumeBatchRevisionRequest,
  supabase: ReturnType<typeof createSupabaseClientWithAccessToken>,
  userId: string,
  timestamp: string,
) {
  const validationError = validateResumeBatchRevisionRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let resumeModelTier;
  try {
    resumeModelTier = parseModelTier(body.resumeModelTier);
  } catch (error) {
    if (error instanceof InvalidModelTierError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const draft = await getGeneratedResumeDraftForUser(supabase, body.draftId, userId);
  if (!draft) {
    return NextResponse.json({ error: "Resume draft not found." }, { status: 404 });
  }

  const revision = await reviseResumeBatchWithAI(
    {
      content: body.content,
      queue: body.queue,
      jobDescriptionText: body.jobDescription.rawText,
      targetRoleTitle: body.jobDescription.roleTitle,
      bulletStyle: body.referenceResume?.bulletStyle,
    },
    process.env.AI_PROVIDER,
    { modelTier: resumeModelTier },
  );

  const candidates = {
    summaryText: revision.summaryText,
    roleUpdates: revision.roleUpdates,
    warnings: revision.warnings,
  };

  if (!batchRevisionHasCandidates(candidates)) {
    return NextResponse.json(
      {
        error: "Resume batch revision produced no valid candidates.",
        validationIssues: candidates.warnings,
        timestamp,
      },
      { status: 422 },
    );
  }

  const shouldPersist = resumeCustomRevisionShouldPersist(body);

  if (shouldPersist) {
    const nextContent = applyResumeBatchRevision(draft.content, candidates);
    const updated = await updateGeneratedResumeDraftInCloudForUser(
      supabase,
      draft.id,
      userId,
      {
        content: nextContent,
        status: resolveDraftStatusAfterContentEdit(draft.status),
      },
    );

    if (!updated) {
      return NextResponse.json({ error: "Failed to save revised resume draft." }, { status: 500 });
    }
  }

  const provider = process.env.AI_PROVIDER ?? "mock";
  const roleCandidates = candidates.roleUpdates.map((update) => {
    const role = body.content.experience[update.roleIndex]!;
    return {
      roleIndex: update.roleIndex,
      company: role.company,
      role: role.role,
      bullets: update.bullets,
    };
  });

  return NextResponse.json({
    summaryCandidate: candidates.summaryText ? { text: candidates.summaryText } : undefined,
    roleCandidates,
    warnings: candidates.warnings,
    provider,
    isMock: provider === "mock",
    providerLabel: getResumeCustomRevisionProviderLabel(provider),
    modelName: revision.modelName,
    requestedModelTier: resumeModelTier,
    modelFallbackApplied: revision.modelFallbackApplied,
    persisted: shouldPersist,
    timestamp,
  });
}
