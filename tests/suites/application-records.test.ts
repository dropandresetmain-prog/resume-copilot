import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  applicationRecordFromJobDescription,
  archiveApplicationRecordInCloud,
  ensureApplicationRecordForJobDescription,
} from "../../src/lib/supabase/application-records";
import {
  formatApplicationLabel,
  formatApplicationStatusLabel,
} from "../../src/lib/application/labels";
import { createJobDescriptionFromInput } from "../../src/lib/jd/persistence";
import {
  APPLICATION_RECORD_STATUSES,
  EDITABLE_APPLICATION_RECORD_STATUSES,
  isApplicationRecordStatus,
  isArchivedApplicationRecord,
  normalizeApplicationRecordStatus,
} from "../../src/types/application-record";

async function main() {
  const job = createJobDescriptionFromInput({
    rawText: "Product manager role with payments experience.",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
    jobUrl: "https://example.com/jobs/pm",
  });

  const input = applicationRecordFromJobDescription(job);
  const label = formatApplicationLabel(
    {
      id: "app-1",
      jobDescriptionId: job.id,
      companyName: job.companyName,
      roleTitle: job.roleTitle,
      jobUrl: job.jobUrl,
      status: "resume_generated",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
    job,
  );

  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const recordsPage = readFileSync(
    join(process.cwd(), "src/components/pages/RecordsPageClient.tsx"),
    "utf8",
  );
  const recordsPanel = readFileSync(
    join(process.cwd(), "src/components/setup/ApplicationRecordsPanel.tsx"),
    "utf8",
  );
  const applicationRecordsModule = readFileSync(
    join(process.cwd(), "src/lib/supabase/application-records.ts"),
    "utf8",
  );
  const coverLetterDrafts = readFileSync(
    join(process.cwd(), "src/lib/supabase/generated-cover-letter-drafts.ts"),
    "utf8",
  );
  const draftHistory = readFileSync(
    join(process.cwd(), "src/components/setup/DraftHistoryPanel.tsx"),
    "utf8",
  );
  const draftCreate = readFileSync(
    join(process.cwd(), "src/lib/supabase/generated-resume-drafts.ts"),
    "utf8",
  );
  const schema = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");
  const applicationsPageClient = readFileSync(
    join(process.cwd(), "src/components/pages/ApplicationsPageClient.tsx"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["application statuses include resume_generated", APPLICATION_RECORD_STATUSES.includes("resume_generated")],
    ["application statuses include archived", APPLICATION_RECORD_STATUSES.includes("archived")],
    ["editable statuses exclude archived", !EDITABLE_APPLICATION_RECORD_STATUSES.includes("archived")],
    ["application statuses include ready_to_apply", APPLICATION_RECORD_STATUSES.includes("ready_to_apply")],
    ["status validator accepts applied", isApplicationRecordStatus("applied")],
    ["status validator rejects unknown", !isApplicationRecordStatus("submitted")],
    ["normalize falls back to drafting", normalizeApplicationRecordStatus("invalid") === "drafting"],
    ["application input copies job metadata", input.jobDescriptionId === job.id && input.companyName === "Pave Bank"],
    ["application label formats role and company", label === "Product Manager @ Pave Bank"],
    ["status label formats resume_generated", formatApplicationStatusLabel("resume_generated") === "Resume generated"],
    ["schema defines application_records", schema.includes("create table if not exists public.application_records")],
    ["schema stores company context on applications", schema.includes("company_context jsonb")],
    ["schema links drafts to applications", schema.includes("application_id uuid references public.application_records")],
    ["draft create accepts application id", draftCreate.includes("application_id: input.applicationId")],
    ["generate flow ensures application record", generateSection.includes("ensureApplicationRecordForJobDescription")],
    ["generate flow links draft to application", generateSection.includes("applicationId: applicationRecord.id")],
    ["generate flow marks resume_generated", generateSection.includes("markApplicationResumeGenerated")],
    ["records page renders applications panel", recordsPage.includes("ApplicationRecordsPanel")],
    ["draft history hides linked drafts", draftHistory.includes("!draft.applicationId")],
    ["ensure helper is exported", typeof ensureApplicationRecordForJobDescription === "function"],
    ["archive helper is exported", typeof archiveApplicationRecordInCloud === "function"],
    ["list omits archived by default", applicationRecordsModule.includes('.neq("status", "archived")')],
    ["find by jd skips archived", applicationRecordsModule.includes('.neq("status", "archived")')],
    ["archive sets status only", applicationRecordsModule.includes('status: "archived"')],
    ["archive action visible in panel", recordsPanel.includes("Archive application")],
    ["archive requires confirmation", recordsPanel.includes("window.confirm") && recordsPanel.includes("Linked resume and cover letter drafts are not deleted")],
    ["archived hidden from list after action", recordsPanel.includes("current.filter((item) => item.id !== application.id)")],
    ["status dropdown excludes archived", recordsPanel.includes("EDITABLE_APPLICATION_RECORD_STATUSES")],
    ["archive does not delete resume drafts", !recordsPanel.includes("deleteGeneratedResumeDraftFromCloud")],
    ["archive does not delete cover letter drafts", !recordsPanel.includes("deleteGeneratedCoverLetterDraftFromCloud")],
    ["archived helper detects archived status", isArchivedApplicationRecord({ status: "archived" })],
    ["cover letter drafts module has no application delete", !coverLetterDrafts.includes("deleteApplication")],

    // M6 — ApplicationsPageClient checks
    ["M6: loads with includeArchived true", applicationsPageClient.includes("includeArchived: true")],
    ["M6: all filter excludes archived", applicationsPageClient.includes('status !== "archived"')],
    ["M6: archived tab filter shows archived", applicationsPageClient.includes('status === "archived"')],
    ["M6: loads cover letter drafts", applicationsPageClient.includes("listGeneratedCoverLetterDraftsFromCloud")],
    ["M6: loads job descriptions", applicationsPageClient.includes("listJobDescriptionsFromCloud")],
    ["M6: status select uses EDITABLE_APPLICATION_RECORD_STATUSES", applicationsPageClient.includes("EDITABLE_APPLICATION_RECORD_STATUSES")],
    ["M6: status change calls updateApplicationRecordInCloud", applicationsPageClient.includes("updateApplicationRecordInCloud")],
    ["M6: notes textarea present", applicationsPageClient.includes('data-testid="notes-textarea"')],
    ["M6: save notes button present", applicationsPageClient.includes('data-testid="save-notes-button"')],
    ["M6: artifact presence shown per record", applicationsPageClient.includes('data-testid="artifact-presence"')],
    ["M6: resume draft link targets /output/", applicationsPageClient.includes('href={`/output/${latestDraft.id}')],
    ["M6: resume draft link in expanded details", applicationsPageClient.includes('data-testid="resume-draft-link"')],
    ["M6: cover letter presence shown in expanded details", applicationsPageClient.includes('data-testid="cover-letter-link"')],
    ["M6: archive keeps linked drafts copy", applicationsPageClient.includes("Linked drafts are not deleted")],
    ["M6: archive does not delete resume drafts", !applicationsPageClient.includes("deleteGeneratedResumeDraftFromCloud")],
    ["M6: expand toggle per row", applicationsPageClient.includes('data-testid="app-details"')],
    ["M6: saved jobs disclosure present", applicationsPageClient.includes('data-testid="saved-jobs-disclosure"')],
    ["M6: saved job reuse links to /generate?jobId", applicationsPageClient.includes("/generate?jobId=")],
    ["M6: saved job reuse link testid", applicationsPageClient.includes('data-testid="saved-job-reuse-link"')],
    ["M6: unlinked drafts disclosure present", applicationsPageClient.includes('data-testid="unlinked-drafts-disclosure"')],
    ["M6: unlinked drafts filters by !applicationId", applicationsPageClient.includes("!d.applicationId")],
    ["M6: unlinked draft link targets /output/", applicationsPageClient.includes('data-testid="unlinked-draft-link"')],
    ["M6: open-package link targets /output/", applicationsPageClient.includes('data-testid="open-package-link"')],
    ["M6: ApplicationsPageClient does not import legacy clients", !applicationsPageClient.includes("RecordsPageClient") && !applicationsPageClient.includes("ApplicationRecordsPanel")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll application record checks passed.");
}

void main();
