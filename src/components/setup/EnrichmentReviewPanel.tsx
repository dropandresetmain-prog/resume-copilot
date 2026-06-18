"use client";

import type { CollatedInventory } from "@/types/collated";
import type {
  BulletEnrichmentSuggestion,
  DuplicateGroupSuggestion,
  EnrichmentRunMetadata,
  EnrichmentState,
  ProviderStatusResponse,
  SuggestionResolution,
  SuggestionStatus,
} from "@/types/enrichment";

import { SMALL_BATCH_DEFAULT_SIZE } from "@/lib/enrichment/batch";
import { getEnrichmentReviewStats } from "@/lib/enrichment/state";

import {
  CollapsibleSection,
  EmptyState,
  SetupCard,
  SourceCitationChips,
} from "@/components/setup/ui";

type EnrichmentReviewPanelProps = {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  providerStatus: ProviderStatusResponse | null;
  isEnriching: boolean;
  enrichError: string | null;
  enrichDebugRaw: string | null;
  onEnrichMissing: () => void;
  onFullRerunEnrich: () => void;
  onTestBatchEnrich: () => void;
  onMergeTestBatch: () => void;
  onClearTestBatch: () => void;
  onSuggestionStatus: (suggestionId: string, status: SuggestionStatus) => void;
  onResolveSuggestion: (
    suggestionId: string,
    resolution: SuggestionResolution,
  ) => void;
  onTestBatchSuggestionStatus: (
    suggestionId: string,
    status: SuggestionStatus,
  ) => void;
  onDuplicateGroupStatus: (
    groupId: string,
    status: DuplicateGroupSuggestion["status"],
  ) => void;
};

function ProviderConfigDisplay({
  providerStatus,
  runMetadata,
}: {
  providerStatus: ProviderStatusResponse | null;
  runMetadata?: EnrichmentRunMetadata;
}) {
  const provider = runMetadata?.provider ?? providerStatus?.provider ?? "mock";
  const isMock = runMetadata?.isMock ?? providerStatus?.isMock ?? true;
  const providerLabel =
    runMetadata?.providerLabel ??
    providerStatus?.providerLabel ??
    "Mock enrichment";

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
      <p className="font-medium text-zinc-900">Provider configuration</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Provider</dt>
          <dd>{providerLabel} ({provider})</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Mode</dt>
          <dd>{isMock ? "Mock / test output" : "Live AI provider"}</dd>
        </div>
        {(runMetadata?.modelName ?? providerStatus?.modelName) && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Model</dt>
            <dd>{runMetadata?.modelName ?? providerStatus?.modelName}</dd>
          </div>
        )}
        {runMetadata ? (
          <>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Batch mode
              </dt>
              <dd>
                {runMetadata.batchMode === "small_batch_test"
                  ? "Small batch test"
                  : "Full inventory"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Bullets sent
              </dt>
              <dd>{runMetadata.bulletsSent}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Suggestions returned
              </dt>
              <dd>{runMetadata.suggestionsReturned}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Timestamp
              </dt>
              <dd>{new Date(runMetadata.timestamp).toLocaleString()}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {providerStatus && !providerStatus.configured && providerStatus.configurationError ? (
        <p className="mt-2 text-amber-800">{providerStatus.configurationError}</p>
      ) : null}
    </div>
  );
}

function EnrichmentDebugPanel({ rawText }: { rawText: string }) {
  return (
    <CollapsibleSection title="Raw model response (debug)" defaultOpen>
      <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">
        {rawText}
      </pre>
    </CollapsibleSection>
  );
}

function ProviderStatusBanner({
  enrichment,
  providerStatus,
  enrichError,
}: {
  enrichment: EnrichmentState;
  providerStatus: ProviderStatusResponse | null;
  enrichError: string | null;
}) {
  if (enrichError) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium">Enrichment provider unavailable</p>
        <p className="mt-1">{enrichError}</p>
        {providerStatus && !providerStatus.configured ? (
          <p className="mt-2">{providerStatus.configurationError}</p>
        ) : null}
      </div>
    );
  }

  const activeProvider = providerStatus?.provider ?? enrichment.providerId ?? "mock";
  const isMock =
    providerStatus?.isMock ??
    enrichment.isMockProvider ??
    activeProvider === "mock";

  if (isMock) {
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Using mock enrichment</p>
        <p className="mt-1">
          These are test suggestions generated locally to validate the workflow.
          They are not real AI analysis. Cursor is not performing enrichment.
          Configure <code className="rounded bg-white px-1">AI_PROVIDER=gemini</code>{" "}
          with an API key when you want real AI output.
        </p>
      </div>
    );
  }

  if (activeProvider === "gemini") {
    return (
      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        <p className="font-medium">Using Gemini enrichment</p>
        <p className="mt-1">
          Suggestions were generated by the configured Gemini provider. Review each
          card before accepting.
        </p>
      </div>
    );
  }

  if (activeProvider === "openai") {
    return (
      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        <p className="font-medium">Using OpenAI enrichment</p>
        <p className="mt-1">
          Suggestions were generated by the configured OpenAI provider.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
      <p className="font-medium">Default provider: mock</p>
      <p className="mt-1">
        Until Gemini or OpenAI is configured, enrichment uses local mock output for
        testing. No external AI is called.
      </p>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <div className="mt-1 text-sm text-zinc-800">{children}</div>
    </div>
  );
}

function ComparisonColumn({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "existing" | "suggested";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "existing"
          ? "border-slate-200 bg-white"
          : "border-violet-200 bg-violet-50/60"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-900">{text}</p>
    </div>
  );
}

function isComparisonSuggestion(suggestion: BulletEnrichmentSuggestion): boolean {
  return (
    suggestion.issueType === "possible_duplicate" ||
    suggestion.issueType === "alternative_wording" ||
    Boolean(suggestion.duplicateGroupId) ||
    Boolean(suggestion.suggestedAfterText)
  );
}

function SuggestionCard({
  suggestion,
  duplicateGroup,
  onStatus,
  onResolve,
}: {
  suggestion: BulletEnrichmentSuggestion;
  duplicateGroup?: DuplicateGroupSuggestion;
  onStatus: (status: SuggestionStatus) => void;
  onResolve: (resolution: SuggestionResolution) => void;
}) {
  const isPending = suggestion.status === "pending";
  const beforeText = suggestion.beforeText || suggestion.bulletDescription || "";
  const suggestedText =
    suggestion.suggestedAfterText ||
    suggestion.alternativeBulletWordings?.[0] ||
    "";
  const siblingTexts =
    duplicateGroup?.bulletDescriptions.filter(
      (description) => description.trim() !== beforeText.trim(),
    ) ?? [];
  const showComparison = isComparisonSuggestion(suggestion);

  return (
    <article
      className={`rounded-lg border p-4 ${
        suggestion.status === "accepted"
          ? "border-emerald-200 bg-emerald-50/50"
          : suggestion.status === "rejected"
            ? "border-red-200 bg-red-50/40"
            : suggestion.status === "ignored"
              ? "border-zinc-200 bg-zinc-50"
              : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {suggestion.issueType.replaceAll("_", " ")}
          </p>
          <h4 className="mt-1 text-base font-semibold text-zinc-900">
            {suggestion.issueTitle}
          </h4>
          <p className="mt-1 text-sm text-zinc-600">
            {suggestion.company} · {suggestion.role}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-600">
          {suggestion.resolution ?? suggestion.status}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {showComparison ? (
          <div className="grid gap-3 md:grid-cols-2">
            <ComparisonColumn label="Existing inventory" text={beforeText} tone="existing" />
            <ComparisonColumn
              label="AI suggested"
              text={
                suggestedText ||
                siblingTexts[0] ||
                "Similar wording flagged — review variants below."
              }
              tone="suggested"
            />
          </div>
        ) : (
          <ReviewSection title="Before">
            <p className="leading-6">{beforeText}</p>
          </ReviewSection>
        )}

        {!showComparison && suggestion.suggestedAfterText ? (
          <ReviewSection title="Suggested after">
            <p className="leading-6">{suggestion.suggestedAfterText}</p>
          </ReviewSection>
        ) : null}

        {suggestion.duplicateReason ? (
          <ReviewSection title="Why flagged as duplicate/similar">
            <p className="leading-6">{suggestion.duplicateReason}</p>
          </ReviewSection>
        ) : null}

        {siblingTexts.length > 0 ? (
          <ReviewSection title="Other variants in this group">
            <ul className="list-disc space-y-1 pl-5">
              {siblingTexts.map((description) => (
                <li key={description}>{description}</li>
              ))}
            </ul>
          </ReviewSection>
        ) : null}

        {suggestion.acceptedWording ? (
          <ReviewSection title="Accepted derived wording">
            <p className="leading-6">{suggestion.acceptedWording}</p>
          </ReviewSection>
        ) : null}

        {suggestion.suggestedKeywords.length > 0 ? (
          <ReviewSection title="Suggested keywords">
            <div className="flex flex-wrap gap-2">
              {suggestion.suggestedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-md bg-white px-2 py-1 text-xs text-zinc-800 ring-1 ring-zinc-200"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </ReviewSection>
        ) : null}

        {suggestion.suggestedCapabilities.length > 0 ? (
          <ReviewSection title="Suggested capabilities">
            <p>{suggestion.suggestedCapabilities.join(", ")}</p>
          </ReviewSection>
        ) : null}

        {suggestion.suggestedRoleTypes.length > 0 ? (
          <ReviewSection title="Suggested role types">
            <p>{suggestion.suggestedRoleTypes.join(", ")}</p>
          </ReviewSection>
        ) : null}

        {suggestion.changes.length > 0 ? (
          <ReviewSection title="Changes">
            <ul className="list-disc space-y-1 pl-5">
              {suggestion.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </ReviewSection>
        ) : null}

        {suggestion.rationale ? (
          <ReviewSection title="Rationale">
            <p className="leading-6">{suggestion.rationale}</p>
          </ReviewSection>
        ) : null}

        {suggestion.riskWarnings.length > 0 ? (
          <ReviewSection title="Risk warnings">
            <ul className="list-disc space-y-1 pl-5 text-amber-900">
              {suggestion.riskWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </ReviewSection>
        ) : null}

        {suggestion.sourceCitations && suggestion.sourceCitations.length > 0 ? (
          <ReviewSection title="Source">
            <SourceCitationChips citations={suggestion.sourceCitations} />
          </ReviewSection>
        ) : null}
      </div>

      {isPending ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {showComparison ? (
            <>
              <button
                type="button"
                onClick={() => onResolve("keep_existing")}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Keep existing
              </button>
              <button
                type="button"
                onClick={() => onResolve("use_suggestion")}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
              >
                Use AI suggestion
              </button>
              <button
                type="button"
                onClick={() => onResolve("rejected")}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onResolve("ignored")}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Ignore for now
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onStatus("accepted")}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => onStatus("rejected")}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onStatus("ignored")}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Ignore for now
              </button>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function DuplicateGroupCard({
  group,
  onStatus,
}: {
  group: DuplicateGroupSuggestion;
  onStatus: (status: DuplicateGroupSuggestion["status"]) => void;
}) {
  const isPending = group.status === "pending";
  const primary = group.bulletDescriptions[0] ?? "";
  const variants = group.bulletDescriptions.slice(1);

  return (
    <article className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        possible duplicate
      </p>
      <h4 className="mt-1 text-base font-semibold text-zinc-900">
        Possible duplicate group
      </h4>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{group.reason}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ComparisonColumn label="Existing inventory" text={primary} tone="existing" />
        <ComparisonColumn
          label="AI suggested variant"
          text={variants[0] ?? "Additional variant wording flagged by AI."}
          tone="suggested"
        />
      </div>

      {variants.length > 1 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Additional variants
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {variants.slice(1).map((description) => (
              <li key={description}>{description}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Status: {group.status}
      </p>

      {isPending ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStatus("keep_all")}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Keep existing
          </button>
          <button
            type="button"
            onClick={() => onStatus("group_variants")}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Use AI suggestion
          </button>
          <button
            type="button"
            onClick={() => onStatus("rejected")}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onStatus("ignored")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Ignore for now
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function EnrichmentReviewPanel({
  collated,
  enrichment,
  providerStatus,
  isEnriching,
  enrichError,
  enrichDebugRaw,
  onEnrichMissing,
  onFullRerunEnrich,
  onTestBatchEnrich,
  onMergeTestBatch,
  onClearTestBatch,
  onSuggestionStatus,
  onResolveSuggestion,
  onTestBatchSuggestionStatus,
  onDuplicateGroupStatus,
}: EnrichmentReviewPanelProps) {
  const hasBullets = collated.experiences.some(
    (experience) => experience.bullets.length > 0,
  );
  const stats = getEnrichmentReviewStats(enrichment);
  const duplicateGroupById = new Map(
    enrichment.duplicateGroups.map((group) => [group.id, group]),
  );
  const pendingSuggestions = enrichment.suggestions.filter(
    (item) => item.status === "pending",
  );
  const reviewedSuggestions = enrichment.suggestions.filter(
    (item) => item.status !== "pending",
  );
  const pendingGroups = enrichment.duplicateGroups.filter(
    (group) => group.status === "pending",
  );
  const approvedKeywords = enrichment.keywordBank.filter((item) => item.approved);
  const testBatch = enrichment.testBatch;
  const testBatchPending = testBatch?.suggestions.filter(
    (item) => item.status === "pending",
  ) ?? [];
  const configuredForLive =
    providerStatus?.configured ?? providerStatus?.isMock ?? true;

  return (
    <SetupCard
      title="AI enrichment review"
      description="Review cards show issue, before text, suggested changes, rationale, and risks. Use small-batch test mode to inspect Gemini output before enriching the full inventory."
    >
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onEnrichMissing}
          disabled={!hasBullets || isEnriching}
          className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnriching ? "Enriching…" : "Enrich new/changed items only"}
        </button>
        <button
          type="button"
          onClick={onFullRerunEnrich}
          disabled={!hasBullets || isEnriching}
          className="rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-sm font-medium text-violet-800 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Re-run full enrichment (advanced)
        </button>
        <button
          type="button"
          onClick={onTestBatchEnrich}
          disabled={!hasBullets || isEnriching}
          className="rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-sm font-medium text-violet-800 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnriching ? "Testing…" : "Test Gemini on small batch"}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Enrichment review counts</p>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Approved keywords
            </dt>
            <dd>{stats.approvedKeywords}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Pending</dt>
            <dd>{stats.pendingSuggestions}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Ignored</dt>
            <dd>{stats.ignoredSuggestions}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Rejected</dt>
            <dd>{stats.rejectedSuggestions}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Accepted</dt>
            <dd>{stats.acceptedSuggestions}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Pending duplicate groups
            </dt>
            <dd>{stats.pendingDuplicateGroups}</dd>
          </div>
        </dl>
        {stats.lastEnrichedAt ? (
          <p className="mt-2 text-xs text-zinc-500">
            Last enrichment run {new Date(stats.lastEnrichedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-zinc-600">
        Small-batch test sends the first {SMALL_BATCH_DEFAULT_SIZE} work experience
        bullets only. Results are stored separately until you merge them into main
        enrichment.
      </p>

      <p className="mt-2 text-sm text-zinc-600">
        Default enrichment skips unchanged items you already reviewed or enriched.
        Full re-run is advanced and may create new suggestions for the entire inventory.
      </p>

      <ProviderConfigDisplay
        providerStatus={providerStatus}
        runMetadata={enrichment.lastRunMetadata}
      />

      <ProviderStatusBanner
        enrichment={enrichment}
        providerStatus={providerStatus}
        enrichError={enrichError}
      />

      {enrichDebugRaw ? <EnrichmentDebugPanel rawText={enrichDebugRaw} /> : null}

      {!configuredForLive && providerStatus && !providerStatus.isMock ? (
        <p className="mt-3 text-sm text-amber-800">
          Live provider is selected but not configured. Set{" "}
          <code className="rounded bg-amber-100 px-1">GEMINI_API_KEY</code> in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and restart
          the dev server.
        </p>
      ) : null}

      {!hasBullets && (
        <p className="mt-3 text-sm text-zinc-500">
          Upload and parse resumes with work experience bullets before running enrichment.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {testBatch ? (
          <CollapsibleSection
            title={`Small-batch test results (${testBatchPending.length} pending)`}
            defaultOpen
          >
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p className="font-medium">Test mode — not merged into main enrichment</p>
              <p className="mt-1">
                These suggestions were generated from a small batch (
                {testBatch.runMetadata.bulletsSent} bullets). Review quality here
                before merging or running full enrichment.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onMergeTestBatch}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Merge into main enrichment
                </button>
                <button
                  type="button"
                  onClick={onClearTestBatch}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100"
                >
                  Discard test batch
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {testBatch.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  duplicateGroup={
                    suggestion.duplicateGroupId
                      ? duplicateGroupById.get(suggestion.duplicateGroupId)
                      : undefined
                  }
                  onStatus={(status) =>
                    onTestBatchSuggestionStatus(suggestion.id, status)
                  }
                  onResolve={(resolution) =>
                    onTestBatchSuggestionStatus(
                      suggestion.id,
                      resolution === "use_suggestion" || resolution === "keep_existing"
                        ? "accepted"
                        : resolution,
                    )
                  }
                />
              ))}
            </div>
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          title={`Pending suggestions (${pendingSuggestions.length})`}
          defaultOpen
        >
          {pendingSuggestions.length === 0 ? (
            <EmptyState
              title="No pending suggestions"
              description="Run enrichment to generate review cards with keywords, capabilities, wording, and duplicate hints."
            />
          ) : (
            <div className="space-y-4">
              {pendingSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  duplicateGroup={
                    suggestion.duplicateGroupId
                      ? duplicateGroupById.get(suggestion.duplicateGroupId)
                      : undefined
                  }
                  onStatus={(status) => onSuggestionStatus(suggestion.id, status)}
                  onResolve={(resolution) =>
                    onResolveSuggestion(suggestion.id, resolution)
                  }
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Duplicate review (${pendingGroups.length} pending)`}
        >
          {enrichment.duplicateGroups.length === 0 ? (
            <EmptyState
              title="No duplicate groups"
              description="Enrichment will suggest duplicate bullet groups when similar wording is detected."
            />
          ) : (
            <div className="space-y-4">
              {enrichment.duplicateGroups.map((group) => (
                <DuplicateGroupCard
                  key={group.id}
                  group={group}
                  onStatus={(status) => onDuplicateGroupStatus(group.id, status)}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Keyword bank (${approvedKeywords.length} approved)`}
        >
          {enrichment.keywordBank.length === 0 ? (
            <EmptyState
              title="Keyword bank is empty"
              description="Accepted keyword suggestions will appear here as approved reusable keywords."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {enrichment.keywordBank.map((item) => (
                <span
                  key={item.id}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    item.approved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {item.keyword}
                  <span className="ml-2 text-xs text-zinc-500">
                    {item.category} · {item.source}
                  </span>
                </span>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Reviewed suggestions (${reviewedSuggestions.length})`}
        >
          {reviewedSuggestions.length === 0 ? (
            <p className="text-sm text-zinc-500">No reviewed suggestions yet.</p>
          ) : (
            <div className="space-y-4">
              {reviewedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  duplicateGroup={
                    suggestion.duplicateGroupId
                      ? duplicateGroupById.get(suggestion.duplicateGroupId)
                      : undefined
                  }
                  onStatus={(status) => onSuggestionStatus(suggestion.id, status)}
                  onResolve={(resolution) =>
                    onResolveSuggestion(suggestion.id, resolution)
                  }
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </SetupCard>
  );
}
