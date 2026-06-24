"use client";

import type { CompanyWebsiteDiscoveryResult } from "@/lib/company-context/discover-company-website";
import type { GenerateContextPolicy, GenerateOutputMode } from "@/lib/generate/context-policy";
import { secondaryButtonClassName } from "@/components/setup/ui";

type CompanyWebsiteDiscoveryPanelProps = {
  hasIntakeComplete: boolean;
  confidentialPosting: boolean;
  outputMode: GenerateOutputMode;
  canDiscover: boolean;
  policy: GenerateContextPolicy;
  contextWebsiteLine: string | null;
  discoveryResult: CompanyWebsiteDiscoveryResult | null;
  isDiscovering: boolean;
  discoveryError: string | null;
  websiteChoice: "auto" | "use_website" | "jd_only";
  disabled?: boolean;
  onFindWebsite: () => void;
  onUseWebsite: () => void;
  onUseJdOnly: () => void;
  onChangeWebsite: () => void;
};

export function CompanyWebsiteDiscoveryPanel({
  hasIntakeComplete,
  confidentialPosting,
  outputMode,
  canDiscover,
  policy,
  contextWebsiteLine,
  discoveryResult,
  isDiscovering,
  discoveryError,
  websiteChoice,
  disabled = false,
  onFindWebsite,
  onUseWebsite,
  onUseJdOnly,
  onChangeWebsite,
}: CompanyWebsiteDiscoveryPanelProps) {
  const candidate = discoveryResult?.candidate;
  const showDiscoveryActions =
    hasIntakeComplete &&
    canDiscover &&
    !policy.effectiveWebsite &&
    policy.discoveryState !== "not_applicable";

  if (!hasIntakeComplete) {
    return (
      <p className="mt-2 text-sm text-slate-600" data-testid="generate-website-discovery-hint">
        Enter company and job description above to look up a company website. Role is optional but
        helps narrow results.
      </p>
    );
  }

  if (confidentialPosting) {
    return (
      <p className="mt-2 text-sm text-slate-600" data-testid="generate-website-discovery-confidential">
        JD-only context. Website discovery disabled.
      </p>
    );
  }

  if (outputMode === "resume_only") {
    return (
      <p className="mt-2 text-sm text-slate-600" data-testid="generate-website-discovery-resume-only">
        Resume only — no company website research needed.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-3" data-testid="generate-website-discovery">
      {contextWebsiteLine && !showDiscoveryActions ? (
        <p className="text-sm text-slate-700" data-testid="generate-effective-website">
          {contextWebsiteLine}
        </p>
      ) : null}

      {showDiscoveryActions ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onFindWebsite}
            disabled={disabled || isDiscovering}
            className={secondaryButtonClassName}
            data-testid="find-company-website"
          >
            {isDiscovering ? "Finding website…" : "Find company website"}
          </button>
          <p className="text-xs text-slate-500">
            {discoveryResult?.costNote ??
              "Uses Firecrawl search + up to 2 verification scrapes (billable). Runs only when you click Find."}
          </p>
        </div>
      ) : null}

      {discoveryError ? (
        <p className="text-sm text-red-700">{discoveryError}</p>
      ) : null}

      {discoveryResult?.status === "unavailable" && !candidate ? (
        <p className="text-sm text-amber-800">
          Website search unavailable
          {discoveryResult.error ? `: ${discoveryResult.error}` : "."} Using JD-only context.
        </p>
      ) : null}

      {candidate && policy.discoveryState === "pending_confirmation" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3">
          <p className="text-sm font-medium text-amber-950">
            Possible website found, please confirm
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {candidate.domain} — {candidate.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUseWebsite}
              disabled={disabled}
              className={secondaryButtonClassName}
              data-testid="confirm-discovered-website"
            >
              Use this website
            </button>
            <button
              type="button"
              onClick={onUseJdOnly}
              disabled={disabled}
              className={secondaryButtonClassName}
            >
              Use JD-only
            </button>
            <button
              type="button"
              onClick={onChangeWebsite}
              disabled={disabled}
              className={secondaryButtonClassName}
            >
              Enter website manually
            </button>
          </div>
        </div>
      ) : null}

      {candidate &&
      candidate.confidence === "high" &&
      websiteChoice !== "jd_only" &&
      policy.discoveryState === "confirmed" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3">
          <p className="text-sm font-medium text-emerald-950">
            Found likely company website: {candidate.domain}
          </p>
          <p className="mt-1 text-sm text-emerald-900">{candidate.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUseWebsite}
              disabled={disabled}
              className={secondaryButtonClassName}
            >
              Use website research
            </button>
            <button
              type="button"
              onClick={onUseJdOnly}
              disabled={disabled}
              className={secondaryButtonClassName}
            >
              Use JD-only
            </button>
            <button
              type="button"
              onClick={onChangeWebsite}
              disabled={disabled}
              className={secondaryButtonClassName}
            >
              Change website
            </button>
          </div>
        </div>
      ) : null}

      {discoveryResult?.status === "no_match" && !candidate ? (
        <p className="text-sm text-slate-600">
          No reliable website found. Using JD-only context.
        </p>
      ) : null}

      {websiteChoice === "jd_only" ? (
        <p className="text-sm text-slate-600">Website research skipped — JD-only context selected.</p>
      ) : null}
    </div>
  );
}

export function focusCompanyWebsiteField() {
  const field = document.getElementById("company-website");
  if (field instanceof HTMLElement) {
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus();
  }
}
