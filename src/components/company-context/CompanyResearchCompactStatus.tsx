"use client";

import { useEffect, useState } from "react";

import { findApplicationRecordByJobDescriptionId } from "@/lib/supabase/application-records";
import {
  formatCompanyResearchStatusLabel,
  resolveCompanyResearchDisplayStatus,
} from "@/lib/company-context/status-labels";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";
import type { CompanyContext } from "@/types/company-context";

type CompanyResearchCompactStatusProps = {
  editingJobId?: string | null;
  combinedMode: boolean;
  companyWebsite: string;
  lastEnsureStatus?: CompanyContextEnsureStatus;
  generationWarning?: string | null;
};

export function CompanyResearchCompactStatus({
  editingJobId,
  combinedMode,
  companyWebsite,
  lastEnsureStatus,
  generationWarning,
}: CompanyResearchCompactStatusProps) {
  const [savedContext, setSavedContext] = useState<CompanyContext | null>(null);

  useEffect(() => {
    if (!editingJobId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const application = await findApplicationRecordByJobDescriptionId(editingJobId);
        if (!cancelled) {
          setSavedContext(application?.companyContext ?? null);
        }
      } catch {
        if (!cancelled) {
          setSavedContext(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingJobId, lastEnsureStatus]);

  const effectiveSavedContext = editingJobId ? savedContext : null;

  if (!combinedMode) {
    return null;
  }

  const status = resolveCompanyResearchDisplayStatus({
    savedContext: effectiveSavedContext,
    lastEnsureStatus,
    combinedMode,
    companyWebsite,
    hadResearchWarning: Boolean(generationWarning),
  });

  return (
    <p className="text-sm text-slate-700 lg:col-span-2">
      {formatCompanyResearchStatusLabel(status)}
      {status === "will_auto_research" ? (
        <span className="mt-1 block text-xs text-slate-500">
          Runs automatically when you click Generate — no manual step required.
        </span>
      ) : null}
    </p>
  );
}
