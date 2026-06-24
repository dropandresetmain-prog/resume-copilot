"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { GenerationProgressPanel } from "@/components/setup/GenerationProgressPanel";
import {
  CompanyWebsiteDiscoveryPanel,
  focusCompanyWebsiteField,
} from "@/components/setup/CompanyWebsiteDiscoveryPanel";
import { ModelTierSelect } from "@/components/ai/ModelTierSelect";
import { CompanyContextEditorPanel } from "@/components/company-context/CompanyContextEditorPanel";
import { CompanyResearchCompactStatus } from "@/components/company-context/CompanyResearchCompactStatus";
import {
  destructiveButtonClassName,
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import {
  formatContextPolicyWebsiteLine,
  resolveGenerateContextPolicy,
  canGenerateWithDiscoveryPolicy,
  type GenerateOutputMode,
} from "@/lib/generate/context-policy";
import {
  buildWebsiteDiscoveryCacheKey,
  shouldOfferWebsiteDiscovery,
  type CompanyWebsiteDiscoveryResult,
} from "@/lib/company-context/discover-company-website";
import { requestCompanyWebsiteDiscovery } from "@/lib/company-context/discover-client";
import { estimateGenerateAiSteps } from "@/lib/generate/ai-call-budget";
import {
  readLastBaseResumeId,
  resolveDefaultBaseResumeId,
  writeLastBaseResumeId,
} from "@/lib/generate/base-resume-preference";
import {
  buildCoverLetterGenerationOptions,
  readCoverLetterFieldsFromJobForm,
} from "@/lib/generate/build-cover-letter-options";
import {
  buildCombinedProgressStages,
  delay,
  getGenerationStageIndices,
  researchProgressLabelAfterEnsure,
  researchProgressLabelForPlan,
  RESUME_ONLY_PROGRESS_STAGES,
} from "@/lib/generate/generation-progress";
import {
  readStoredCoverLetterModelTier,
  readStoredResumeModelTier,
  writeStoredCoverLetterModelTier,
  writeStoredResumeModelTier,
} from "@/lib/ai/model-tier-storage";
import type { ModelTier } from "@/lib/ai/model-tiers";
import { planCompanyResearchForGeneration } from "@/lib/company-context/research-plan";
import {
  buildArtifactSnapshot,
  classifyCombinedGenerationFailure,
  getPrimaryRetryAction,
  type ArtifactGenerationStatus,
} from "@/lib/generate/generation-artifact-status";
import {
  ensureJobDescriptionForGeneration,
  type SaveJobForGenerationHandler,
} from "@/lib/generate/save-job-for-generation";
import { countApprovedKeywords } from "@/lib/enrichment/state";
import { generateAndSaveCoverLetterDraft } from "@/lib/generate/cover-letter-generation";
import {
  ensureCompanyContextForGeneration,
  type CompanyContextEnsureStatus,
} from "@/lib/company-context/ensure-for-generation";
import { hasWebsiteBackedResearch } from "@/lib/company-context/normalize";
import { buildResumeDraftPayloadFromInventory } from "@/lib/resume-draft/payload";
import {
  fetchResumeDraftProviderStatus,
  requestResumeDraftGeneration,
  type ResumeDraftClientError,
} from "@/lib/resume-draft/client";
import {
  ensureApplicationRecordForJobDescription,
  getApplicationRecordFromCloud,
  markApplicationResumeGenerated,
} from "@/lib/supabase/application-records";
import {
  createGeneratedResumeDraftInCloud,
  listGeneratedResumeDraftsFromCloud,
} from "@/lib/supabase/generated-resume-drafts";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type { GeneratedResumeDraftRecord, ResumeDraftProviderStatusResponse } from "@/types/resume-draft";

type GenerateTailoredResumeSectionProps = {
  inventory: InventoryState;
  jobDescriptions: StoredJobDescription[];
  jobForm: JobDescriptionInput;
  editingJobId?: string | null;
  isSignedIn: boolean;
  disabled?: boolean;
  confidentialPosting?: boolean;
  jobUrl?: string;
  onJobUrlChange?: (jobUrl: string) => void;
  onClearForm?: () => void;
  onSaveJob: SaveJobForGenerationHandler;
  onGenerationFinished?: () => void;
};

type PartialCoverLetterFailure = {
  resumeDraft: GeneratedResumeDraftRecord;
  savedJob: StoredJobDescription;
  applicationId: string;
  coverLetterError: string;
  coverLetterDebugRaw?: string;
};

type ResumeGenerationContext = {
  savedJob: StoredJobDescription;
  applicationId: string;
  resumeDraft: GeneratedResumeDraftRecord;
  companyContext?: import("@/types/company-context").CompanyContext;
};

export function GenerateTailoredResumeSection({
  inventory,
  jobDescriptions,
  jobForm,
  editingJobId = null,
  isSignedIn,
  disabled = false,
  confidentialPosting = false,
  jobUrl = "",
  onJobUrlChange,
  onClearForm,
  onSaveJob,
  onGenerationFinished,
}: GenerateTailoredResumeSectionProps) {
  const router = useRouter();
  const [selectedBaseResumeId, setSelectedBaseResumeId] = useState("");
  const [providerStatus, setProviderStatus] =
    useState<ResumeDraftProviderStatusResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStageIndex, setProgressStageIndex] = useState(0);
  const [progressStages, setProgressStages] = useState<string[]>([
    ...RESUME_ONLY_PROGRESS_STAGES,
  ]);
  const [error, setError] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);
  const [generateMode, setGenerateMode] =
    useState<GenerateOutputMode>("resume_and_cover_letter");
  const [country, setCountry] = useState("Singapore");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [resumeStatus, setResumeStatus] = useState<ArtifactGenerationStatus>("pending");
  const [coverLetterStatus, setCoverLetterStatus] =
    useState<ArtifactGenerationStatus>("pending");
  const [partialCoverLetterFailure, setPartialCoverLetterFailure] =
    useState<PartialCoverLetterFailure | null>(null);
  const [companyContextEditorKey, setCompanyContextEditorKey] = useState(0);
  const [companyContextEnsureStatus, setCompanyContextEnsureStatus] =
    useState<CompanyContextEnsureStatus | undefined>();
  const [companyContextWarning, setCompanyContextWarning] = useState<string | null>(null);
  const [resumeModelTier, setResumeModelTier] = useState<ModelTier>(() =>
    readStoredResumeModelTier(),
  );
  const [coverLetterModelTier, setCoverLetterModelTier] = useState<ModelTier>(() =>
    readStoredCoverLetterModelTier(),
  );
  const [websiteDiscoveryBundle, setWebsiteDiscoveryBundle] = useState<{
    cacheKey: string;
    result: CompanyWebsiteDiscoveryResult | null;
    error: string | null;
    choice: "auto" | "use_website" | "jd_only";
  }>({
    cacheKey: "",
    result: null,
    error: null,
    choice: "auto",
  });
  const [isDiscoveringWebsite, setIsDiscoveringWebsite] = useState(false);
  const approvedKeywordCount = countApprovedKeywords(inventory.enrichment);

  const discoveryQueryInput = useMemo(
    () => ({
      companyName: jobForm.companyName ?? "",
      roleTitle: jobForm.roleTitle,
      country,
      jobDescriptionText: jobForm.rawText,
      confidentialPosting,
      companyWebsiteInput: companyWebsite,
      outputMode: generateMode,
    }),
    [
      jobForm.companyName,
      jobForm.roleTitle,
      jobForm.rawText,
      country,
      confidentialPosting,
      companyWebsite,
      generateMode,
    ],
  );

  const discoveryCacheKey = useMemo(
    () => buildWebsiteDiscoveryCacheKey(discoveryQueryInput),
    [discoveryQueryInput],
  );

  const discoveryState =
    websiteDiscoveryBundle.cacheKey === discoveryCacheKey
      ? websiteDiscoveryBundle
      : {
          cacheKey: discoveryCacheKey,
          result: null,
          error: null,
          choice: "auto" as const,
        };

  const discoveryResult = discoveryState.result;
  const discoveryError = discoveryState.error;
  const websiteDiscoveryChoice = discoveryState.choice;

  const discoveryInput = useMemo(
    () => ({
      ...discoveryQueryInput,
      forceJdOnly: websiteDiscoveryChoice === "jd_only",
    }),
    [discoveryQueryInput, websiteDiscoveryChoice],
  );

  function updateDiscoveryState(
    patch: Partial<{
      result: CompanyWebsiteDiscoveryResult | null;
      error: string | null;
      choice: "auto" | "use_website" | "jd_only";
    }>,
  ) {
    setWebsiteDiscoveryBundle((current) => {
      const base =
        current.cacheKey === discoveryCacheKey
          ? current
          : {
              cacheKey: discoveryCacheKey,
              result: null,
              error: null,
              choice: "auto" as const,
            };
      return {
        cacheKey: discoveryCacheKey,
        result: patch.result !== undefined ? patch.result : base.result,
        error: patch.error !== undefined ? patch.error : base.error,
        choice: patch.choice !== undefined ? patch.choice : base.choice,
      };
    });
  }

  const canOfferWebsiteDiscovery = shouldOfferWebsiteDiscovery(discoveryInput);

  function buildDiscoveredWebsitePolicy(
    result: CompanyWebsiteDiscoveryResult | null,
    choice: "auto" | "use_website" | "jd_only",
  ) {
    if (!result?.candidate || choice === "jd_only") {
      return null;
    }
    const candidate = result.candidate;
    return {
      url: candidate.url,
      confidence: candidate.confidence,
      userConfirmed: choice === "use_website" || candidate.confidence === "high",
      userDeclined: false,
    };
  }

  function buildContextPolicy(
    result: CompanyWebsiteDiscoveryResult | null = discoveryResult,
    choice: "auto" | "use_website" | "jd_only" = websiteDiscoveryChoice,
  ) {
    return resolveGenerateContextPolicy({
      confidentialPosting,
      companyWebsiteInput: companyWebsite,
      jobDescriptionText: jobForm.rawText,
      outputMode: generateMode,
      forceJdOnly: choice === "jd_only",
      discoveredWebsite: buildDiscoveredWebsitePolicy(result, choice),
    });
  }

  const contextPolicy = buildContextPolicy();
  const contextWebsiteLine = formatContextPolicyWebsiteLine(contextPolicy);
  const hasIntakeComplete = Boolean(
    jobForm.companyName?.trim() && jobForm.rawText.trim(),
  );

  useEffect(() => {
    fetchResumeDraftProviderStatus()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveDefault() {
      if (inventory.resumes.length === 0) {
        if (!cancelled) {
          setSelectedBaseResumeId("");
        }
        return;
      }

      let recentDraftReferenceResumeId: string | null = null;
      if (isSignedIn) {
        try {
          const drafts = await listGeneratedResumeDraftsFromCloud();
          recentDraftReferenceResumeId = drafts[0]?.referenceResumeId ?? null;
        } catch {
          recentDraftReferenceResumeId = null;
        }
      }

      const defaultId = resolveDefaultBaseResumeId(inventory.resumes, {
        recentDraftReferenceResumeId,
      });

      if (!cancelled) {
        setSelectedBaseResumeId((current) => {
          if (current && inventory.resumes.some((resume) => resume.id === current)) {
            return current;
          }
          return defaultId;
        });
      }
    }

    void resolveDefault();
    return () => {
      cancelled = true;
    };
  }, [inventory.resumes, isSignedIn]);

  const effectiveBaseResumeId =
    selectedBaseResumeId || resolveDefaultBaseResumeId(inventory.resumes);

  const providerConfigured = providerStatus?.configured ?? false;
  const hasJobText = Boolean(jobForm.rawText.trim());
  const canGenerate =
    isSignedIn &&
    !disabled &&
    !isDiscoveringWebsite &&
    providerConfigured &&
    inventory.resumes.length > 0 &&
    hasJobText &&
    Boolean(effectiveBaseResumeId) &&
    canGenerateWithDiscoveryPolicy(contextPolicy);

  async function handleFindCompanyWebsite(): Promise<CompanyWebsiteDiscoveryResult | null> {
    if (isDiscoveringWebsite || !canOfferWebsiteDiscovery) {
      return discoveryResult;
    }

    setIsDiscoveringWebsite(true);
    updateDiscoveryState({ error: null });

    try {
      const result = await requestCompanyWebsiteDiscovery(discoveryInput);
      updateDiscoveryState({ result });
      return result;
    } catch (error) {
      updateDiscoveryState({
        error:
          error instanceof Error ? error.message : "Company website discovery failed.",
      });
      return null;
    } finally {
      setIsDiscoveringWebsite(false);
    }
  }

  async function advanceStage(index: number) {
    setProgressStageIndex(index);
    await delay(250);
  }

  async function runResumeGeneration(
    policyForRun: ReturnType<typeof buildContextPolicy>,
  ): Promise<ResumeGenerationContext & { companyContextWarning?: string }> {
    const isCombined = generateMode === "resume_and_cover_letter";
    const stages = getGenerationStageIndices(isCombined);

    await advanceStage(stages.savingJob);

    const savedJob = await ensureJobDescriptionForGeneration(jobForm, {
      jobDescriptions,
      saveJob: onSaveJob,
      editingId: editingJobId,
    });

    const policy = policyForRun;
    const effectiveWebsite = policy.effectiveWebsite ?? undefined;

    const applicationRecord = await ensureApplicationRecordForJobDescription(savedJob);
    let companyContextForGeneration = applicationRecord.companyContext ?? undefined;
    if (
      !policy.allowSavedWebsiteContext &&
      hasWebsiteBackedResearch(companyContextForGeneration)
    ) {
      companyContextForGeneration = undefined;
    }
    let contextWarning: string | undefined;

    await advanceStage(stages.preparingApplication);

    if (policy.needsCompanyContext) {
      const plan = planCompanyResearchForGeneration({
        savedContext: applicationRecord.companyContext,
        policy,
      });
      setProgressStages(
        buildCombinedProgressStages(researchProgressLabelForPlan(plan)),
      );
      await advanceStage(stages.companyResearch!);
      const ensured = await ensureCompanyContextForGeneration({
        applicationId: applicationRecord.id,
        savedContext: applicationRecord.companyContext,
        job: savedJob,
        country,
        companyWebsite: effectiveWebsite,
        additionalInstructions,
        autoGenerate: true,
        allowSavedWebsiteContext: policy.allowSavedWebsiteContext,
        runWebsiteResearch: policy.runWebsiteResearch,
      });
      setCompanyContextEnsureStatus(ensured.status);
      setProgressStages((current) => {
        const next = [...current];
        next[stages.companyResearch!] = researchProgressLabelAfterEnsure(
          ensured.status,
          Boolean(ensured.warning),
        );
        return next;
      });
      if (ensured.companyContext) {
        companyContextForGeneration = ensured.companyContext;
      }
      if (ensured.warning) {
        contextWarning = ensured.warning;
        setCompanyContextWarning(ensured.warning);
      } else {
        setCompanyContextWarning(null);
      }
    } else {
      setCompanyContextEnsureStatus(undefined);
      setCompanyContextWarning(null);
    }

    writeLastBaseResumeId(effectiveBaseResumeId);

    await advanceStage(stages.buildingEvidence);

    const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
      inventory,
      jobDescription: savedJob,
      referenceResumeId: effectiveBaseResumeId,
      companyContext: companyContextForGeneration,
      resumeModelTier,
      coverLetterModelTier:
        generateMode === "resume_and_cover_letter" ? coverLetterModelTier : undefined,
    });

    await advanceStage(stages.generatingResume);

    const response = await requestResumeDraftGeneration({
      ...generationInput,
      inputSnapshot,
      resumeModelTier,
    });

    const resumeDraft = await createGeneratedResumeDraftInCloud({
      jobDescriptionId: savedJob.id,
      referenceResumeId: effectiveBaseResumeId,
      applicationId: applicationRecord.id,
      content: response.content,
      rationale: response.rationale,
      inputSnapshot: response.inputSnapshot,
      provider: response.provider,
      modelName: response.modelName,
      status: response.draftStatus ?? "generated",
    });

    await markApplicationResumeGenerated(applicationRecord.id);

    if (!isCombined) {
      await advanceStage(stages.savingDrafts);
    }

    return {
      savedJob,
      applicationId: applicationRecord.id,
      resumeDraft,
      companyContext: companyContextForGeneration,
      companyContextWarning: contextWarning,
    };
  }

  function readCoverLetterFields() {
    return readCoverLetterFieldsFromJobForm(jobForm, {
      country,
      companyWebsite: contextPolicy.effectiveWebsite ?? companyWebsite,
      additionalInstructions,
    });
  }

  async function runCoverLetterGeneration(context: ResumeGenerationContext) {
    const stages = getGenerationStageIndices(true);
    await advanceStage(stages.generatingCoverLetter!);
    return generateAndSaveCoverLetterDraft(
      buildCoverLetterGenerationOptions({
        job: context.savedJob,
        resumeDraft: context.resumeDraft,
        applicationId: context.applicationId,
        fields: readCoverLetterFields(),
        savedCompanyContext: context.companyContext,
        coverLetterModelTier,
      }),
    );
  }

  async function handleGenerate() {
    if (isGenerating || isDiscoveringWebsite) {
      return;
    }

    const policyForRun = buildContextPolicy(discoveryResult);
    if (!canGenerateWithDiscoveryPolicy(policyForRun)) {
      updateDiscoveryState({
        error: "Confirm the discovered website or choose JD-only before generating.",
      });
      return;
    }

    setError(null);
    setDebugRaw(null);
    setPartialCoverLetterFailure(null);
    setCompanyContextWarning(null);
    setCompanyContextEnsureStatus(undefined);
    setResumeStatus("generating");
    setCoverLetterStatus(generateMode === "resume_and_cover_letter" ? "pending" : "pending");
    setIsGenerating(true);
    setProgressStageIndex(0);
    setProgressStages(
      generateMode === "resume_and_cover_letter"
        ? buildCombinedProgressStages("Researching company website")
        : [...RESUME_ONLY_PROGRESS_STAGES],
    );

    try {
      const context = await runResumeGeneration(policyForRun);
      setResumeStatus("success");

      if (context.companyContextWarning) {
        setCompanyContextWarning(context.companyContextWarning);
      }

      if (generateMode === "resume_and_cover_letter") {
        setCoverLetterStatus("generating");
        try {
          const coverRecord = await runCoverLetterGeneration(context);
          void coverRecord;
          setCoverLetterStatus("success");
          await advanceStage(getGenerationStageIndices(true).savingDrafts);
          await delay(200);
          onGenerationFinished?.();
          router.push(`/resume-preview/${context.resumeDraft.id}`);
          return;
        } catch (coverLetterError) {
          const clientError = coverLetterError as ResumeDraftClientError;
          setCoverLetterStatus("failed");
          setPartialCoverLetterFailure({
            resumeDraft: context.resumeDraft,
            savedJob: context.savedJob,
            applicationId: context.applicationId,
            coverLetterError:
              clientError instanceof Error
                ? clientError.message
                : "Cover letter generation failed.",
            coverLetterDebugRaw: clientError.rawModelResponse,
          });
          return;
        }
      }

      setCoverLetterStatus("pending");
      await advanceStage(getGenerationStageIndices(false).savingDrafts);
      await delay(200);

      onGenerationFinished?.();
      router.push(`/resume-preview/${context.resumeDraft.id}`);
    } catch (generationError) {
      const clientError = generationError as ResumeDraftClientError;
      setResumeStatus("failed");
      setCoverLetterStatus("pending");
      setError(
        clientError instanceof Error
          ? clientError.message
          : "Tailored resume generation failed.",
      );
      setDebugRaw(clientError.rawModelResponse ?? null);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRetryCoverLetter() {
    if (isGenerating || !partialCoverLetterFailure) {
      return;
    }

    setError(null);
    setDebugRaw(null);
    setCoverLetterStatus("generating");
    setIsGenerating(true);
    setProgressStages(buildCombinedProgressStages("Using saved company research"));
    setProgressStageIndex(getGenerationStageIndices(true).generatingCoverLetter!);

    try {
      const application = await getApplicationRecordFromCloud(
        partialCoverLetterFailure.applicationId,
      );
      const coverRecord = await generateAndSaveCoverLetterDraft(
        buildCoverLetterGenerationOptions({
          job: partialCoverLetterFailure.savedJob,
          resumeDraft: partialCoverLetterFailure.resumeDraft,
          applicationId: partialCoverLetterFailure.applicationId,
          fields: readCoverLetterFields(),
          savedCompanyContext: application?.companyContext,
          coverLetterModelTier,
        }),
      );
      void coverRecord;
      setCoverLetterStatus("success");
      setPartialCoverLetterFailure(null);
      onGenerationFinished?.();
      router.push(`/resume-preview/${partialCoverLetterFailure.resumeDraft.id}`);
    } catch (coverLetterError) {
      const clientError = coverLetterError as ResumeDraftClientError;
      setCoverLetterStatus("failed");
      setPartialCoverLetterFailure((current) =>
        current
          ? {
              ...current,
              coverLetterError:
                clientError instanceof Error
                  ? clientError.message
                  : "Cover letter generation failed.",
              coverLetterDebugRaw: clientError.rawModelResponse,
            }
          : current,
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const failureKind = classifyCombinedGenerationFailure(
    buildArtifactSnapshot({
      resumeStatus,
      coverLetterStatus,
    }),
  );
  const primaryRetryAction = getPrimaryRetryAction(failureKind);

  const storedPreference = readLastBaseResumeId();
  const aiStepEstimate = estimateGenerateAiSteps({
    mode: generateMode,
    policy: contextPolicy,
  });

  function generateCtaLabel(): string {
    if (generateMode === "resume_and_cover_letter") {
      return "Generate Resume & Cover Letter";
    }
    if (generateMode === "cover_letter_only") {
      return "Generate Cover Letter";
    }
    return "Generate Tailored Resume";
  }

  // Readiness strip: consolidates all pre-generation conditions into one compact strip.
  const readinessItems: { id: string; ready: boolean; label: string; href?: string }[] = [
    { id: "sign-in", ready: isSignedIn, label: "Sign in to generate" },
    {
      id: "upload",
      ready: inventory.resumes.length > 0,
      label: "Upload a resume in Uploads",
      href: "/setup",
    },
    { id: "paste-jd", ready: hasJobText, label: "Paste a job description" },
    {
      id: "provider",
      ready: providerConfigured,
      label: providerStatus?.configurationError ?? "Configure resume provider",
    },
  ];
  const pendingItems = readinessItems.filter((item) => !item.ready);
  const showReadinessStrip = !isGenerating && !canGenerate && providerStatus !== null;

  return (
    <div className="border-t border-slate-200 pt-5">
      {showReadinessStrip ? (
        <div
          className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          data-testid="generate-readiness-strip"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Readiness
          </p>
          <ul className="mt-2 space-y-1.5">
            {readinessItems.map((item) => (
              <li key={item.id} className="flex items-baseline gap-2 text-sm">
                <span
                  className={
                    item.ready ? "font-medium text-emerald-600" : "text-slate-400"
                  }
                >
                  {item.ready ? "✓" : "·"}
                </span>
                {item.ready ? (
                  <span className="text-slate-500 line-through">{item.label}</span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="text-amber-800 underline underline-offset-2 hover:text-amber-950"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-slate-700">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
          {pendingItems.length === 0 ? null : null}
        </div>
      ) : null}

      {isGenerating ? (
        <div className="mt-4">
          <GenerationProgressPanel
            stageIndex={progressStageIndex}
            stages={progressStages}
            title={
              generateMode === "resume_and_cover_letter"
                ? "Generating tailored resume & cover letter"
                : "Generating tailored resume"
            }
          />
        </div>
      ) : (
        <>
          <div
            className="mt-5 rounded-lg border border-cyan-100 bg-cyan-50/50 px-4 py-3"
            data-testid="generate-company-context"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900/70">
              Company website &amp; context
            </p>
            <CompanyWebsiteDiscoveryPanel
              hasIntakeComplete={hasIntakeComplete}
              confidentialPosting={confidentialPosting}
              outputMode={generateMode}
              canDiscover={canOfferWebsiteDiscovery}
              policy={contextPolicy}
              contextWebsiteLine={contextWebsiteLine}
              discoveryResult={discoveryResult}
              isDiscovering={isDiscoveringWebsite}
              discoveryError={discoveryError}
              websiteChoice={websiteDiscoveryChoice}
              disabled={disabled || isGenerating}
              onFindWebsite={() => void handleFindCompanyWebsite()}
              onUseWebsite={() => {
                updateDiscoveryState({ choice: "use_website", error: null });
              }}
              onUseJdOnly={() => {
                updateDiscoveryState({ choice: "jd_only", error: null });
              }}
              onChangeWebsite={() => {
                updateDiscoveryState({ choice: "auto", error: null });
                focusCompanyWebsiteField();
              }}
            />
            {hasIntakeComplete ? (
              <div
                className="mt-3 border-t border-cyan-100/80 pt-3"
                data-testid="generate-context-policy-summary"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900/60">
                  Context policy
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {contextPolicy.summaryHeadline}
                </p>
                <p className="mt-1 text-sm text-slate-600">{contextPolicy.summaryDetail}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-lg border border-slate-200/80 bg-slate-50/60 px-4 py-3">
            <label htmlFor="base-resume-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Base resume (formatting template)
            </label>
            <select
              id="base-resume-select"
              value={effectiveBaseResumeId}
              onChange={(event) => setSelectedBaseResumeId(event.target.value)}
              disabled={disabled || inventory.resumes.length === 0 || isGenerating}
              className={`${formFieldClassName} mt-1.5 max-w-xl`}
            >
              {inventory.resumes.length === 0 ? (
                <option value="">No uploaded resumes</option>
              ) : (
                inventory.resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.filename}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Layout and bullet style only — tailored content comes from your career inventory.
              {storedPreference && storedPreference === effectiveBaseResumeId
                ? " Last used base resume selected."
                : null}
            </p>
          </div>

          <div
            className="mt-5 rounded-lg border border-slate-200/80 bg-white px-4 py-3"
            data-testid="generate-output-mode"
          >
            <label htmlFor="generate-mode" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Output
            </label>
            <select
              id="generate-mode"
              value={generateMode}
              onChange={(event) => setGenerateMode(event.target.value as GenerateOutputMode)}
              disabled={disabled || isGenerating}
              className={`${formFieldClassName} mt-1.5 max-w-xl`}
            >
              <option value="resume_and_cover_letter">Resume + Cover Letter</option>
              <option value="resume_only">Resume only</option>
              <option value="cover_letter_only" disabled>
                Cover letter only (requires existing tailored resume — parked)
              </option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              Default is resume and cover letter. Cover letter only needs a saved tailored resume draft.
            </p>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <p
              className="mb-3 max-w-md text-sm text-slate-600"
              data-testid="generate-ai-step-estimate"
            >
              {aiStepEstimate.headline}
            </p>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || isGenerating || generateMode === "cover_letter_only"}
              aria-busy={isGenerating}
              className={`${primaryButtonClassName} min-h-12 w-full max-w-md px-8 py-3.5 text-base font-semibold shadow-md sm:w-auto`}
            >
              {generateCtaLabel()}
            </button>
            <p className="mt-3 max-w-md text-sm text-slate-500">
              Saves the job, applies context policy automatically, then opens your application package.
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-400">{aiStepEstimate.footnote}</p>
          </div>

          <details className="mt-5 rounded-lg border border-slate-200 bg-white">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span>More options (optional)</span>
                <span className="text-xs font-normal text-slate-400">
                  Models · job URL · website · instructions
                </span>
              </span>
            </summary>
            <div className="grid gap-4 border-t border-slate-100 px-4 pb-4 pt-3 lg:grid-cols-2">
              {providerStatus ? (
                <p className="text-sm text-slate-600 lg:col-span-2">
                  Provider: {providerStatus.providerLabel}
                  {providerStatus.modelName ? ` · ${providerStatus.modelName}` : ""}
                  {providerStatus.isMock ? " (test mode)" : ""}
                </p>
              ) : null}

              <ModelTierSelect
                id="resume-model-tier"
                label="Resume model"
                value={resumeModelTier}
                disabled={disabled || isGenerating || generateMode === "cover_letter_only"}
                onChange={(tier) => {
                  setResumeModelTier(tier);
                  writeStoredResumeModelTier(tier);
                }}
              />
              <ModelTierSelect
                id="cover-letter-model-tier"
                label="Cover letter model"
                value={coverLetterModelTier}
                disabled={
                  disabled ||
                  isGenerating ||
                  generateMode === "resume_only" ||
                  generateMode === "cover_letter_only"
                }
                onChange={(tier) => {
                  setCoverLetterModelTier(tier);
                  writeStoredCoverLetterModelTier(tier);
                }}
              />

              <div>
                <label htmlFor="jd-url" className={labelClassName}>
                  Job URL (optional)
                </label>
                <input
                  id="jd-url"
                  type="url"
                  value={jobUrl}
                  onChange={(event) => onJobUrlChange?.(event.target.value)}
                  disabled={disabled || isGenerating || !onJobUrlChange}
                  placeholder="https://…"
                  className={formFieldClassName}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Link to the posting — not used as the company homepage for research.
                </p>
              </div>
              <div>
                <label htmlFor="company-country" className={labelClassName}>
                  Country / location
                </label>
                <input
                  id="company-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  disabled={disabled || isGenerating}
                  className={formFieldClassName}
                />
              </div>
              <div>
                <label htmlFor="company-website" className={labelClassName}>
                  Company website
                </label>
                <input
                  id="company-website"
                  value={companyWebsite}
                  onChange={(event) => setCompanyWebsite(event.target.value)}
                  disabled={disabled || isGenerating || confidentialPosting}
                  placeholder="https://company.com"
                  className={formFieldClassName}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {confidentialPosting
                    ? "Disabled for confidential postings — JD-only context."
                    : "Not the job posting URL. Used when context policy is website + JD."}
                </p>
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="additional-instructions" className={labelClassName}>
                  Custom instructions (optional)
                </label>
                <textarea
                  id="additional-instructions"
                  value={additionalInstructions}
                  onChange={(event) => setAdditionalInstructions(event.target.value)}
                  disabled={disabled || isGenerating}
                  rows={3}
                  className={formFieldClassName}
                  placeholder="Tone, addressee hints, or extra company notes."
                />
              </div>

              <p className="text-sm text-slate-500 lg:col-span-2">
                Approved keywords available: {approvedKeywordCount}
              </p>

              {onClearForm ? (
                <div className="lg:col-span-2">
                  <button
                    type="button"
                    onClick={onClearForm}
                    disabled={disabled || isGenerating}
                    className={`${destructiveButtonClassName} sm:w-auto`}
                    data-testid="generate-clear-form"
                  >
                    Clear form
                  </button>
                </div>
              ) : null}

              <CompanyResearchCompactStatus
                editingJobId={editingJobId}
                policy={contextPolicy}
                lastEnsureStatus={companyContextEnsureStatus}
                generationWarning={companyContextWarning}
              />

              <CompanyContextEditorPanel
                key={`${editingJobId ?? "new"}-${companyContextEditorKey}`}
                jobForm={jobForm}
                jobDescriptions={jobDescriptions}
                editingJobId={editingJobId}
                country={country}
                companyWebsite={contextPolicy.effectiveWebsite ?? companyWebsite}
                additionalInstructions={additionalInstructions}
                onSaveJob={onSaveJob}
                policy={contextPolicy}
                lastEnsureStatus={companyContextEnsureStatus}
                onSaved={() => setCompanyContextEditorKey((current) => current + 1)}
              />
            </div>
          </details>
        </>
      )}

      {companyContextWarning ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {companyContextWarning}
        </p>
      ) : null}

      {partialCoverLetterFailure ? (
        <div className="mt-3 space-y-3">
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            Resume generated successfully.
          </p>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Cover letter generation failed: {partialCoverLetterFailure.coverLetterError}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/resume-preview/${partialCoverLetterFailure.resumeDraft.id}`}
              className={secondaryButtonClassName}
            >
              Open resume preview
            </Link>
            <button
              type="button"
              onClick={() => void handleRetryCoverLetter()}
              disabled={!canGenerate || isGenerating}
              className={primaryButtonClassName}
            >
              {isGenerating ? "Retrying cover letter…" : "Retry Cover Letter"}
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || isGenerating}
              className={secondaryButtonClassName}
            >
              Regenerate Resume
            </button>
          </div>
          {partialCoverLetterFailure.coverLetterDebugRaw ? (
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Raw cover letter model response
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-slate-800">
                {partialCoverLetterFailure.coverLetterDebugRaw}
              </pre>
            </details>
          ) : null}
        </div>
      ) : error ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate || isGenerating}
            className={primaryButtonClassName}
          >
            {primaryRetryAction === "regenerate_resume"
              ? "Regenerate Resume"
              : "Retry Generate Tailored Resume"}
          </button>
        </div>
      ) : null}

      {debugRaw ? (
        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Raw model response
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto text-xs text-slate-800">{debugRaw}</pre>
        </details>
      ) : null}

      {/* Sticky bottom Generate bar — mobile only, not shown while generating */}
      {!isGenerating ? (
        <div className="sm:hidden" data-testid="generate-mobile-sticky-cta">
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || isGenerating}
              aria-busy={isGenerating}
              className={`${primaryButtonClassName} w-full py-3 text-base font-semibold`}
              aria-label={generateCtaLabel()}
            >
              {generateCtaLabel()}
            </button>
          </div>
          {/* Spacer so fixed bar does not cover bottom page content */}
          <div className="h-[4.5rem]" aria-hidden="true" />
        </div>
      ) : null}

    </div>
  );
}
