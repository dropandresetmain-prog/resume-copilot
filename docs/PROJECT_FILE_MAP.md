**Folio redesign** — See [`docs/FOLIO_REDESIGN.md`](FOLIO_REDESIGN.md) for current milestone. v0.9.19B AI/evidence notes in [`HANDOFF.md`](HANDOFF.md).

## App routes

| Path | File | Purpose |
|------|------|---------|
| `/` | `src/app/page.tsx` | Landing page (`LandingHero`) |
| `/auth/login` | `src/app/auth/login/page.tsx` | Sign in |
| `/auth/signup` | `src/app/auth/signup/page.tsx` | Sign up |
| `/onboarding` | `src/app/onboarding/page.tsx` | First-run upload + profile setup |
| `/dashboard` | `src/app/(workspace)/dashboard/page.tsx` | Dashboard (`DashboardPageClient`) |
| `/inventory` | `src/app/(workspace)/inventory/page.tsx` | **Career vault** (`CareerVaultPageClient`) |
| `/generate` | `src/app/(workspace)/generate/page.tsx` | Job intake + tailor resume |
| `/records` | `src/app/(workspace)/records/page.tsx` | **Applications** (`ApplicationsPageClient`) |
| `/profile` | `src/app/(workspace)/profile/page.tsx` | Application Communication Profile |
| `/settings` | `src/app/(workspace)/settings/page.tsx` | Settings shell |
| `/output/[draftId]` | `src/app/(workspace)/output/[draftId]/page.tsx` | **Output editor** — unified resume + cover letter (`OutputEditorPageClient`) |
| `/resume-preview/[draftId]` | `src/app/(workspace)/resume-preview/[draftId]/page.tsx` | Legacy application package (`ResumePreviewPageClient`) |
| `/resume-preview/[draftId]/edit` | `src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx` | Draft review/edit workspace |
| `/cover-letter-preview/[draftId]` | `src/app/(workspace)/cover-letter-preview/[draftId]/page.tsx` | Cover letter editor + export |
| `/setup` | `src/app/(workspace)/setup/page.tsx` | Legacy Manage Uploads (`ManageUploadsPageClient`) |
| `/dev-tools` | `src/app/(workspace)/dev-tools/page.tsx` | Dev utilities — **404 in production** |
| `/api/ai/enrich` | `src/app/api/ai/enrich/route.ts` | Server-side AI enrichment |
| `/api/ai/generate-resume` | `src/app/api/ai/generate-resume/route.ts` | Resume draft generation |
| `/api/ai/generate-company-context` | `src/app/api/ai/generate-company-context/route.ts` | Company context generation (v0.9.3+) |
| `/api/ai/generate-cover-letter` | `src/app/api/ai/generate-cover-letter/route.ts` | Cover letter generation (v0.9.0) |
| `/api/ai/revise-cover-letter` | `src/app/api/ai/revise-cover-letter/route.ts` | Cover letter quick revision (v0.9.2) |
| `/api/approve/resume-draft` | `src/app/api/approve/resume-draft/route.ts` | Approve + server PDF validation (v0.7.0) |
| `/api/validate/resume-pdf` | `src/app/api/validate/resume-pdf/route.ts` | Server PDF page-count check |
| `/api/export/resume-pdf` | `src/app/api/export/resume-pdf/route.ts` | Approved resume → PDF |
| `/api/export/resume-docx` | `src/app/api/export/resume-docx/route.ts` | Approved resume → DOCX |
| `/api/export/cover-letter-pdf` | `src/app/api/export/cover-letter-pdf/route.ts` | Cover letter → PDF |
| `/api/export/cover-letter-docx` | `src/app/api/export/cover-letter-docx/route.ts` | Cover letter → DOCX |

Workspace routes share `src/app/(workspace)/layout.tsx` (`WorkspaceProvider` + `AppShell`).

**Auth:** Protected prefixes in `src/middleware.ts` — unauthenticated users redirect to `/auth/login`.

## App shell

| File | Purpose |
|------|---------|
| `src/components/app/WorkspaceProvider.tsx` | Auth session, Supabase sync, shared state/handlers |
| `src/components/app/AppShell.tsx` | Folio shell — sidebar offset content area (`ml-[220px]`), top bar |
| `src/components/app/AppNav.tsx` | Forest-green sidebar nav (Dashboard, Career vault, Generate, Applications, Profile, Settings) |
| `src/components/app/TopBar.tsx` | Workspace top bar |
| `src/components/app/nav.ts` | Nav items and active-route helper |
| `src/components/ui/dialog.tsx` | Radix Dialog — Folio tokens (Career Vault import modal) |

## Page clients (Folio redesign)

| File | Route |
|------|-------|
| `src/components/pages/DashboardPageClient.tsx` | `/dashboard` |
| `src/components/pages/CareerVaultPageClient.tsx` | `/inventory` — Career vault (FAB, extraction, upload dialog, app counts) |
| `src/components/pages/GeneratePageClient.tsx` | `/generate` |
| `src/components/pages/ApplicationsPageClient.tsx` | `/records` — Applications table |
| `src/components/pages/OutputEditorPageClient.tsx` | `/output/[draftId]` — unified output editor |
| `src/components/pages/ProfilePageClient.tsx` | `/profile` |
| `src/components/pages/ResumePreviewPageClient.tsx` | `/resume-preview/[draftId]` — legacy application package |
| `src/components/pages/CoverLetterPreviewPageClient.tsx` | `/cover-letter-preview/[draftId]` |
| `src/components/pages/ManageUploadsPageClient.tsx` | `/setup` — legacy uploads |
| `src/components/pages/InventoryPageClient.tsx` | *(unmounted)* — pre-redesign inventory reference |
| `src/components/pages/DevToolsPageClient.tsx` | `/dev-tools` |

## Setup / shared components

| File | Purpose |
|------|---------|
| `src/components/setup/AuthPanel.tsx` | Sign in / sign up / magic link / sign out |
| `src/components/setup/CloudFileStoragePanel.tsx` | Supabase original-file storage status |
| `src/components/setup/UploadCard.tsx` | DOCX upload dropzone |
| `src/components/setup/JDInputPanel.tsx` | JD intake + inline generate flow on `/generate` (v0.7.3) |
| `src/components/setup/GenerateTailoredResumeSection.tsx` | Base resume, primary Generate command, progress, cover letter mode + advanced company fields (v0.9.11D) |
| `src/components/setup/GenerationProgressPanel.tsx` | Staged loading UI during generation |
| `src/lib/generate/base-resume-preference.ts` | Last-used base resume (`localStorage`) + default resolution |
| `src/lib/generate/save-job-for-generation.ts` | Auto-save/reuse job on generate |
| `src/lib/generate/generation-progress.ts` | Progress stage labels + percent helper |
| `src/components/setup/ApplicationRecordsPanel.tsx` | Application cards: primary package action, status, notes, linked draft + cover letter links (Records) |
| `src/components/setup/DraftHistoryPanel.tsx` | Unlinked legacy draft list (Records) |
| `src/components/landing/LandingCta.tsx` | Auth-aware single landing CTA |
| `src/components/setup/SavedJobCard.tsx` | Saved job card with summary + full JD expand |
| `src/components/setup/JDInputPanel.tsx` | Job paste/save form + saved jobs list |
| `src/components/setup/EnrichmentReviewPanel.tsx` | AI suggestion review UI |
| `src/components/setup/SummaryCards.tsx` | Per-resume summary stats |
| `src/components/setup/ResumeList.tsx` | Uploaded resume management |
| `src/components/setup/CollatedInventoryView.tsx` | Default collated working view |
| `src/components/setup/SourceResumesView.tsx` | Per-resume debug view |
| `src/components/setup/ParsedInventorySection.tsx` | Debug parsed section list |
| `src/components/setup/InventoryResumeCard.tsx` | Collapsible per-resume debug card |
| `src/components/setup/EducationCard.tsx` | Education card |
| `src/components/setup/UnparsedSectionCard.tsx` | Unparsed / needs review UI |
| `src/components/setup/ExperienceCard.tsx` | Work experience card (debug) |
| `src/components/setup/SetupAlerts.tsx` | Errors and warnings |
| `src/components/setup/ui.tsx` | Shared cards, workspace bands, section headers, form/button classes, tabs, citation chips |

## Supabase (active persistence)

**Migration naming (SOP):** Files under `supabase/migrations/` must match Supabase CLI format `<timestamp>_human_readable_name.sql` (e.g. `20260619_add_resume_draft_metadata.sql`). Avoid milestone codes like `004a` or `4A` — those are skipped by `supabase db push`. See **Project SOPs** in `HANDOFF.md`.

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Tables, RLS, storage buckets and policies |
| `supabase/migrations/20260619_add_resume_draft_metadata.sql` | Adds resume draft metadata columns/indexes |
| `supabase/migrations/20260620_add_saved_job_summary.sql` | Adds `summary` column to `job_descriptions` |
| `supabase/migrations/20260622_application_communication_v090.sql` | Profile table + cover letter columns (v0.9.0) |
| `supabase/migrations/20260623_application_company_context_v093.sql` | `company_context` on application_records (v0.9.3) |
| `src/lib/supabase/generated-resume-drafts.ts` | Create/list/get/delete drafts; `fetchResumeApplicationCountsFromCloud()` for vault app counts |
| `src/lib/supabase/generated-cover-letter-drafts.ts` | Create/list/get/update cover letter drafts (v0.9.0) |
| `src/lib/supabase/application-communication-profiles.ts` | Load/save Application Communication Profile (v0.9.0) |
| `src/lib/supabase/application-records.ts` | Application records CRUD + ensure per JD (v0.8.0) |
| `src/types/application-record.ts` | Application status types |
| `src/lib/application/labels.ts` | Application card labels |
| `src/lib/supabase/client.ts` | Browser Supabase client + env validation |
| `src/lib/supabase/auth.ts` | Password, magic link, sign out |
| `src/lib/supabase/types.ts` | Row/record types, bucket constants |
| `src/lib/supabase/resume-inventories.ts` | Load / save / delete cloud inventory |
| `src/lib/supabase/job-descriptions.ts` | Cloud JD list / create / update / delete / clear |
| `src/lib/supabase/files.ts` | Upload / download / list / delete stored files |

## Types

| File | Purpose |
|------|---------|
| `src/types/resume.ts` | Parsed resume and inventory types |
| `src/types/collated.ts` | Derived collated inventory types |
| `src/types/enrichment.ts` | AI enrichment and keyword bank types |
| `src/types/jd.ts` | Job description types |
| `src/types/resume-draft.ts` | Generated resume draft types (4A) |
| `src/types/cover-letter-draft.ts` | Cover letter draft + secondary format types (v0.9.0) |
| `src/types/application-communication-profile.ts` | Application Communication Profile type (v0.9.0) |
| `src/types/company-context.ts` | Company context type + generation request/response (v0.9.3) |
| `src/types/files.ts` | Stored file metadata types |

## Pure helpers (not active persistence)

| File | Purpose |
|------|---------|
| `src/lib/inventory/persistence.ts` | Validate, enrich, serialize inventory; test-only JSON export/import |
| `src/lib/jd/persistence.ts` | JD validation, duplicate detection, in-memory list transforms; test serialize/parse |
| `src/lib/legacy/local-data.ts` | One-time warning if pre-Supabase `localStorage` keys exist |
| `src/lib/storage/file-hash.ts` | SHA-256 for Supabase file deduplication |
| `src/lib/storage/file-metadata.ts` | File metadata normalization and display |

## Removed / deprecated

| File | Status |
|------|--------|
| `src/components/SetupPageClient.tsx` | **Deleted** — replaced by `WorkspaceProvider` + page clients |
| `src/lib/storage/indexed-db.ts` | **Deleted** — was Dexie blob storage |
| `src/components/setup/FileStorageStatusPanel.tsx` | **Deleted** — replaced by `CloudFileStoragePanel` |
| `dexie` npm package | **Removed** |
| Export/import UI on `UploadCard` | **Removed** — Supabase is source of truth |
| `downloadInventoryJson` | **Test helper only** — not used by UI |

## AI enrichment

| File | Purpose |
|------|---------|
| `src/lib/ai/provider.ts` | Provider selection |
| `src/lib/ai/mock.ts` | Mock provider (tests) |
| `src/lib/ai/gemini.ts` | Gemini provider |
| `src/lib/ai/openai.ts` | OpenAI placeholder |
| `src/lib/enrichment/state.ts` | Suggestion review, keyword bank, incremental merge |
| `src/lib/enrichment/payload.ts` | Collated inventory → AI input |
| `src/lib/enrichment/prompt.ts` | AI prompt instructions |
| `src/lib/enrichment/normalize.ts` | Legacy enrichment field migration |
| `src/lib/parser/profile-contact.ts` | Resume profile/contact parsing from preamble |
| `src/lib/jd/summary.ts` | Heuristic saved job summary + card preview text |
| `src/lib/jd/labels.ts` | Saved job display label (`Company — Role`) |
| `src/lib/navigation/landing-cta.ts` | Landing CTA route resolver |
| `src/lib/jd/extract-metadata.ts` | Heuristic company/role extraction from pasted JD |
| `src/lib/inventory/backfill-profile-contact.ts` | Safe profile/contact backfill for legacy inventories |
| `src/components/setup/ProfileContactBackfillPanel.tsx` | Manual backfill UI (Dev Tools) |

## AI resume draft (4A / 4B)

| File | Purpose |
|------|---------|
| `src/lib/ai/resume-draft-provider.ts` | Resume draft provider selection |
| `src/lib/ai/resume-draft-mock.ts` | Mock resume draft provider |
| `src/lib/ai/resume-draft-gemini.ts` | Gemini resume draft provider |
| `src/lib/resume-draft/payload.ts` | Inventory + JD + reference resume → AI input + snapshot (v0.7.7 edits + regen controls) |
| `src/components/setup/InventoryEditPanel.tsx` | Edit/hide inventory bullets overlay (v0.7.7) |
| `src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx` | Resume evidence queue + regenerate (v0.7.7; Additional Experience v0.9.18A) |
| `src/lib/inventory/edits.ts` | Inventory edit overlay helpers (v0.7.7) |
| `src/lib/inventory/active-collated.ts` | Active collated view for generation (v0.7.7) |
| `src/lib/resume-draft/regeneration.ts` | Regeneration feasibility + source key helpers (v0.7.7) |
| `src/types/inventory-edits.ts` | `InventoryEdits` overlay type (v0.7.7) |
| `src/lib/resume-draft/bullet-payload.ts` | Bullet ranking/cap/force/exclude selection (v0.7.7) |
| `src/lib/resume-draft/enrichment-wording.ts` | Accepted enrichment wording lookup by bulletKey (v0.7.6) |
| `src/lib/resume-draft/prompt.ts` | Resume draft generation prompt |
| `src/lib/resume-draft/generation-validation.ts` | Normalize, validate, prepare + hard/soft classification (v0.9.8B) |
| `src/lib/resume-draft/repair-generated-content.ts` | Auto-repair excess roles/bullets (v0.9.8B) |
| `src/lib/resume-draft/additional-experience.ts` | Title:Detail normalization for additional experience |
| `src/lib/resume-draft/draft-status.ts` | Draft status constants (`approved`, `needs_review`, etc.) |
| `src/lib/resume-draft/build-export-document-model.ts` | Shared export document model builder |
| `src/lib/resume-draft/resolve-export-request.ts` | Export/approve shared draft resolution + company context |
| `src/lib/resume-draft/approve-resume-draft-client.ts` | Client approve + one-page validation |
| `src/lib/resume-draft/parse.ts` | Parse and map model JSON |
| `src/lib/resume-draft/client.ts` | Browser client for generate-resume API |
| `src/lib/resume-draft/review-state.ts` | Draft review state + apply edits (4B) |
| `src/lib/resume-draft/layout.ts` | Final layout model, sort, page-fit estimate, fit score (v0.5.1+) |
| `src/lib/resume-draft/document-model.ts` | Canonical `ResumeDocumentModel` for preview + export (v0.6.0) |
| `src/components/resume-drafts/ResumePdfPreview.tsx` | PDF Preview iframe — exact export HTML (v0.6.4) |
| `src/lib/resume-draft/export-client.ts` | Export API client + file-type download behavior (v0.6.2+) |
| `src/lib/resume-draft/resume-layout-styles.ts` | Print/browser spacing + uppercase name + PDF CSS (v0.6.3+) |
| `src/lib/resume-draft/export-layout-settings.ts` | Sanitize/persist approved layout settings (v0.6.3) |
| `src/lib/resume-draft/pdf-html.ts` | HTML renderer for direct PDF export (v0.6.2+) |
| `src/lib/resume-draft/pdf-export.ts` | Puppeteer PDF generation (v0.6.2+) |
| `src/lib/supabase/resume-pdf-storage.ts` | PDF upload to `generated-documents` (v0.6.2+) |
| `src/app/api/export/resume-pdf/route.ts` | POST PDF export API (v0.6.2+) |
| `src/lib/resume-draft/docx-font.ts` | DOCX font + px→pt mapping (v0.6.1+) |
| `src/lib/resume-draft/docx-layout-helpers.ts` | Company line segments + layout constants (v0.6.1) |
| `src/lib/resume-draft/docx-export.ts` | DOCX generation from document model (v0.6.0+) |
| `src/lib/resume-draft/export-filename.ts` | Export filename + storage path helpers (v0.6.0) |
| `src/lib/resume-draft/export-request.ts` | Export API request validation (v0.6.0) |
| `src/lib/resume-draft/export-client.ts` | Browser client for DOCX export API (v0.6.0) |
| `src/lib/supabase/server-client.ts` | Supabase client from user access token (v0.6.0) |
| `src/lib/supabase/resume-docx-storage.ts` | Upload exported DOCX to storage (v0.6.0) |
| `src/components/resume-drafts/DownloadResumePdfButton.tsx` | Download PDF UI button (v0.6.2+) |
| `src/components/resume-drafts/DownloadResumeDocxButton.tsx` | Download DOCX UI button (v0.6.0) |
| `src/lib/resume-draft/education-layout.ts` | Render-time education normalization (v0.5.5) |
| `src/lib/resume-draft/keyword-repair.ts` | Generic `Experience:` bullet repair (v0.5.4) |
| `src/lib/resume-draft/preview-optimizer.ts` | Auto one-page preview settings (v0.5.4) |
| `src/lib/resume-draft/skills-section.ts` | Skills/Languages/Interests extraction (v0.7.5) |
| `src/lib/resume-draft/draft-labels.ts` | Generated draft list labels (v0.5.4) |
| `src/lib/resume-draft/preview-settings.ts` | Preview font/spacing constants (v0.5.3+) |
| `src/lib/resume-draft/reference-format.ts` | Reference resume formatting profile (no content) |
| `src/components/resume-drafts/FinalResumeLayoutPreview.tsx` | Canonical A4 resume preview |
| `src/components/resume-drafts/ResumeAssessmentPanel.tsx` | Fit score + rationale panel |
| `src/components/pages/ResumePreviewPageClient.tsx` | Post-generation preview page client |
| `src/components/pages/ResumeDraftEditPageClient.tsx` | Draft edit workspace page client (v0.5.2) |
| `src/lib/resume-draft/preview-helpers.ts` | Risk/confidence/source label helpers |
| `src/components/resume-drafts/ResumeDraftPreview.tsx` | Readable resume preview (4B) |
| `src/components/resume-drafts/ResumeDraftReviewWorkspace.tsx` | Preview + review + mark reviewed (4B) |
| `src/components/resume-drafts/ResumeDraftSectionCard.tsx` | Review section wrapper |
| `src/components/resume-drafts/ResumeDraftBulletCard.tsx` | Experience bullet review card |
| `src/components/resume-drafts/ResumeDraftReviewPanel.tsx` | Re-export of review workspace |

## Application package / company research / cover letter (v0.9.x)

| File | Purpose |
|------|---------|
| `src/lib/firecrawl/scrape-company-website.ts` | Firecrawl scrape helper (v0.9.5) |
| `src/lib/firecrawl/url.ts` | Company website URL validation + job board detection |
| `src/lib/company-context/research.ts` | Firecrawl + Gemini research orchestration (v0.9.5) |
| `src/lib/company-context/build-company-context.ts` | Build context from JD/website inputs |
| `src/lib/company-context/research-plan.ts` | Research plan + dynamic progress stages (v0.9.6) |
| `src/lib/company-context/ensure-for-generation.ts` | Auto-generate + save; website-backed reuse (v0.9.6) |
| `src/lib/company-context/status-labels.ts` | Compact company research status labels (v0.9.6) |
| `src/lib/company-context/prompt.ts` | Gemini company context prompt |
| `src/lib/company-context/parse.ts` | JSON parse + save validation |
| `src/lib/company-context/normalize.ts` | Legacy shape + usable/website-backed helpers |
| `src/lib/company-context/resolve-for-generation.ts` | Saved context or JD fallback |
| `src/lib/company-context/client.ts` | Browser client for generate-company-context API |
| `src/lib/ai/company-context-provider.ts` | Company context provider selection |
| `src/lib/ai/company-context-gemini.ts` | Gemini company context provider |
| `src/lib/ai/call-gemini.ts` | Gemini retry + fallback model (v0.9.4) |
| `src/lib/ai/config.ts` | `GEMINI_MODEL_PRIMARY` / `GEMINI_MODEL_FALLBACK` overrides |
| `src/components/company-context/CompanyContextPreviewPanel.tsx` | Research display (package + cover letter) |
| `src/components/company-context/CompanyContextEditorPanel.tsx` | Collapsed research editor (Generate Advanced) |
| `src/components/company-context/CompanyResearchCompactStatus.tsx` | Compact status on Generate (v0.9.6) |
| `src/components/application-package/ApplicationPackageSummary.tsx` | Package status header (v0.9.8) |
| `src/components/application-package/ApplicationPackageCoverLetterPanel.tsx` | Inline cover letter (v0.9.8) |
| `src/components/application-package/PackageFitSummaryPanel.tsx` | AI fit summary on package (v0.9.13D) |
| `src/components/application-package/PackageTailoringDiagnosticsPanel.tsx` | Evidence tailoring diagnostics UI (v0.9.19) |
| `src/lib/package/tailoring-diagnostics.ts` | Deterministic tailoring diagnostics builder (v0.9.19) |
| `src/lib/package/fit-summary.ts` | Package fit summary composition (v0.9.13D) |
| `src/components/cover-letters/CoverLetterEvidenceRegenerationPanel.tsx` | Pending-only cover-letter proof staging (v0.9.18B) |
| `src/components/pages/ResumePreviewPageClient.tsx` | Application package + repair banner (v0.9.8B) |
| `src/components/pages/CoverLetterPreviewPageClient.tsx` | Cover letter editor page |
| `src/lib/cover-letter/company-name.ts` | Display name + URL detection (v0.9.7 / v0.9.8A) |
| `src/lib/cover-letter/format-body.ts` | Inline cover letter paragraph split (v0.9.8A) |
| `src/lib/cover-letter/story-ranking.ts` | Experience ranking for cover letter (v0.9.7) |
| `src/lib/cover-letter/export-filename.ts` | Structured export filenames (v0.9.7) |
| `src/lib/cover-letter/prompt.ts` | Bridge architecture prompt (v0.9.7) |
| `src/lib/cover-letter/generation-validation.ts` | Word count, URLs, bridges |
| `src/lib/cover-letter/word-limits.ts` | 420-word hard max (v0.9.2) |
| `src/lib/cover-letter/banned-phrases.ts` | Banned phrase detection (v0.9.2) |
| `src/lib/cover-letter/revision-prompt.ts` | Quick revision prompt (v0.9.2) |
| `src/lib/cover-letter/revision-parse.ts` | Revision JSON parse (v0.9.2) |
| `src/lib/cover-letter/revision-client.ts` | Revise API browser client (v0.9.2) |
| `src/lib/cover-letter/resume-evidence.ts` | Resume → evidence spine |
| `src/lib/cover-letter/parse.ts` | Parse formal + secondary formats |
| `src/lib/cover-letter/client.ts` | Generate-cover-letter API client |
| `src/lib/cover-letter/export-client.ts` | Cover letter export download client |
| `src/lib/cover-letter/pdf-html.ts` | Cover letter print HTML |
| `src/lib/cover-letter/pdf-export.ts` | Puppeteer PDF |
| `src/lib/cover-letter/docx-export.ts` | DOCX export |
| `src/lib/ai/cover-letter-provider.ts` | Cover letter provider selection |
| `src/lib/ai/cover-letter-mock.ts` | Mock provider |
| `src/lib/ai/cover-letter-gemini.ts` | Gemini provider |
| `src/lib/ai/revise-cover-letter-provider.ts` | Revision provider selection |
| `src/lib/generate/build-cover-letter-options.ts` | Cover letter generation input builder |
| `src/lib/generate/cover-letter-generation.ts` | Orchestrate + save cover letter |
| `src/lib/generate/generation-artifact-status.ts` | Application artifact summary labels |
| `src/components/cover-letters/CoverLetterStagedRevisionPanel.tsx` | Staged cover letter revision chips + Revise button |
| `src/components/cover-letters/DownloadCoverLetterPdfButton.tsx` | Download PDF |
| `src/components/cover-letters/DownloadCoverLetterDocxButton.tsx` | Download DOCX |
| `src/components/cover-letters/SecondaryCommunicationsPanel.tsx` | Secondary outreach formats |
| `src/components/cover-letters/ResumeCoverLetterPanel.tsx` | Legacy panel (superseded on package page) |

## Inventory and parser

| File | Purpose |
|------|---------|
| `src/lib/inventory/inventory.ts` | Upsert, delete, counts |
| `src/lib/inventory/collation.ts` | Build collated inventory |
| `src/lib/inventory/split-items.ts` | Atomic splitting for additional experience and skills |
| `src/lib/inventory/normalize.ts` | Merge keys, bullet similarity |
| `src/lib/parser/docx-parser.ts` | DOCX parsing orchestration |
| `src/lib/parser/pipeline.ts` | End-to-end parse pipeline |
| `src/lib/parser/section-detection.ts` | Generic section alias detection |
| `src/lib/parser/experience-parser.ts` | Profile orchestration + confidence |
| `src/lib/parser/profiles/two-line-column.ts` | Two-line column layout profile |
| `src/lib/parser/heuristics.ts` | Date/bullet/column primitives |
| `src/lib/parser/education.ts` | Education parsing |
| `src/lib/parser/sections.ts` | Section-scoped parsers |

## Tests (`npm run test`)

Runner: `tests/run-all.ts` — executes suites in `tests/suites/*.test.ts` (46 suites). Policy and source-grep audit: `docs/TESTING.md`.

| Path | Purpose |
|------|---------|
| `tests/run-all.ts` | Single test entrypoint (replaces per-script npm chain) |
| `tests/suites/*.test.ts` | Domain verification suites (parser, inventory, generation, export, cover letter, research, application shell) |

Utility scripts (not tests): `scripts/pull-gemini-analysis.ts`, `scripts/build-gemini-analysis-bundle.ts`.

## Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview (root) |
| `docs/FOLIO_REDESIGN.md` | Folio UI redesign phases, routes, remaining tasks |
| `docs/FOLIO_DESIGN_TOKENS.md` | Grove design tokens (`globals.css`) |
| `docs/CAREER_VAULT.md` | Career vault data flow, app counts, panel patterns |
| `docs/FIT_SCORE_RUBRIC.md` | Target fit-score rubric (`fit-rubric-v1`) — product IP |
| `docs/HANDOFF.md` | Current milestone and run instructions |
| `docs/ROADMAP.md` | Planned milestones |
| `docs/PROJECT_FILE_MAP.md` | This file — route and module map |
| `docs/KNOWN_ISSUES.md` | Known limitations |
| `docs/TEST_CHECKLIST.md` | Manual QA checklist |
| `docs/TESTING.md` | Automated test layout, policy, source-grep audit |
| `AUDIT_CLAUDE.md` | Phase 0 pre-redesign audit (historical) |
