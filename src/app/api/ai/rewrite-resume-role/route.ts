import { getResumeDraftProviderStatus } from "@/lib/ai/resume-draft-provider";
import { InvalidModelTierError, parseModelTier } from "@/lib/ai/model-tiers";
import {
  getResumeRoleRewriteProviderLabel,
  rewriteResumeRoleWithAI,
} from "@/lib/ai/resume-role-rewrite-provider";
import { ResumeRoleRewriteParseError } from "@/lib/resume-draft/role-rewrite-parse";
import { validateRewrittenRoleBullets } from "@/lib/resume-draft/targeted-role-rewrite";
import type { ResumeRoleRewriteRequest } from "@/types/resume-draft";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const providerStatus = getResumeDraftProviderStatus();

  try {
    const body = (await request.json()) as ResumeRoleRewriteRequest;

    if (!body?.jobDescription?.rawText?.trim()) {
      return NextResponse.json({ error: "A valid job description is required." }, { status: 400 });
    }

    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return NextResponse.json({ error: "At least one role rewrite is required." }, { status: 400 });
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

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          error:
            providerStatus.configurationError ??
            "AI resume draft provider is not configured.",
          timestamp,
        },
        { status: 500 },
      );
    }

    const rewrittenRoles = [];
    const validationIssues: string[] = [];
    let lastModelName: string | undefined;
    let lastFallbackApplied = false;

    for (const roleRequest of body.roles) {
      const result = await rewriteResumeRoleWithAI(
        {
          currentRole: roleRequest.currentRole,
          forcedBulletKeys: roleRequest.forcedBulletKeys,
          inventoryBullets: roleRequest.inventoryBullets,
          jobDescriptionText: body.jobDescription.rawText,
          targetRoleTitle: body.jobDescription.roleTitle,
          bulletStyle: body.referenceResume?.bulletStyle,
        },
        process.env.AI_PROVIDER,
        { modelTier: resumeModelTier },
      );

      lastModelName = result.modelName;
      lastFallbackApplied = result.modelFallbackApplied ?? false;

      const issues = validateRewrittenRoleBullets({
        bullets: result.bullets,
        forcedBulletKeys: roleRequest.forcedBulletKeys,
        allowedSourceBulletKeys: roleRequest.allowedSourceBulletKeys,
      });

      if (issues.length > 0) {
        validationIssues.push(
          ...issues.map((issue) => `${roleRequest.currentRole.company}: ${issue}`),
        );
        continue;
      }

      rewrittenRoles.push({
        roleIndex: roleRequest.roleIndex,
        bullets: result.bullets,
        notes: result.notes,
      });
    }

    if (rewrittenRoles.length !== body.roles.length) {
      return NextResponse.json(
        {
          error: "Targeted role rewrite failed validation.",
          validationIssues,
          timestamp,
        },
        { status: 422 },
      );
    }

    const provider = process.env.AI_PROVIDER ?? "mock";
    return NextResponse.json({
      roles: rewrittenRoles,
      validationIssues,
      provider,
      isMock: provider === "mock",
      providerLabel: getResumeRoleRewriteProviderLabel(provider),
      modelName: lastModelName,
      requestedModelTier: resumeModelTier,
      modelFallbackApplied: lastFallbackApplied,
      timestamp,
    });
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
        error: error instanceof Error ? error.message : "Targeted role rewrite failed.",
        timestamp,
      },
      { status: 500 },
    );
  }
}
