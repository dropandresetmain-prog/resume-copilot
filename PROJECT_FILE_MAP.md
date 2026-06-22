# Project File Map

## App routes

| Path | File | Purpose |
|------|------|---------|
| `/` | `src/app/page.tsx` | Landing page (CTA → Manage Uploads) |
| `/generate` | `src/app/(workspace)/generate/page.tsx` | Job intake + tailor resume (main product) |
| `/inventory` | `src/app/(workspace)/inventory/page.tsx` | Career inventory + enrichment |
| `/records` | `src/app/(workspace)/records/page.tsx` | Applications + saved jobs + communications + unlinked draft history |
| `/profile` | `src/app/(workspace)/profile/page.tsx` | Application Communication Profile editor (v0.9.0) |
| `/setup` | `src/app/(workspace)/setup/page.tsx` | Manage Uploads (auth, upload, parsing) |
| `/resume-preview/[draftId]` | `src/app/(workspace)/resume-preview/[draftId]/page.tsx` | Final A4 layout preview + assessment (v0.5.1+) |
| `/resume-preview/[draftId]/edit` | `src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx` | Draft review/edit workspace (v0.5.2) |
| `/cover-letter-preview/[draftId]` | `src/app/(workspace)/cover-letter-preview/[draftId]/page.tsx` | Formal cover letter preview/edit + export (v0.9.0) |
| `/api/ai/enrich` | `src/app/api/ai/enrich/route.ts` | Server-side AI enrichment |
| `/api/ai/generate-resume` | `src/app/api/ai/generate-resume/route.ts` | Server-side resume draft generation (4A) |
| `/api/ai/generate-company-context` | `src/app/api/ai/generate-company-context/route.ts` | Company context generation (v0.9.3) |
| `/api/ai/generate-cover-letter` | `src/app/api/ai/generate-cover-letter/route.ts` | Server-side cover letter generation (v0.9.0) |
| `/api/ai/revise-cover-letter` | `src/app/api/ai/revise-cover-letter/route.ts` | Cover letter quick revision (v0.9.2) |
| `/api/export/resume-docx` | `src/app/api/export/resume-docx/route.ts` | Approved draft → DOCX export (v0.6.0) |
| `/api/export/cover-letter-pdf` | `src/app/api/export/cover-letter-pdf/route.ts` | Cover letter → PDF export (v0.9.0) |
| `/api/export/cover-letter-docx` | `src/app/api/export/cover-letter-docx/route.ts` | Cover letter → DOCX export (v0.9.0) |

Workspace routes share `src/app/(workspace)/layout.tsx` (`WorkspaceProvider` + `AppShell`).

## App shell

| File | Purpose |
|------|---------|
| `src/components/app/WorkspaceProvider.tsx` | Auth session, Supabase sync, shared state/handlers |
| `src/components/app/AppShell.tsx` | Page content wrapper with nav |
| `src/components/app/AppNav.tsx` | Main navigation (Generate → … → Dev Tools) |
| `src/components/app/nav.ts` | Nav items and active-route helper |
| `src/components/app/PageHeader.tsx` | Per-page title and description |

## Page clients (v0.4.4)

| File | Route |
|------|-------|
| `src/components/pages/GeneratePageClient.tsx` | `/generate` — JD intake + generate tailored resume (v0.7.2) |
| `src/components/pages/InventoryPageClient.tsx` | `/inventory` |
| `src/components/pages/RecordsPageClient.tsx` | `/records` — applications + saved jobs + communications + draft history (v0.8.0+) |
| `src/components/pages/ProfilePageClient.tsx` | `/profile` — Application Communication Profile editor (v0.9.0) |
| `src/components/pages/CoverLetterPreviewPageClient.tsx` | `/cover-letter-preview/[draftId]` — cover letter preview/edit/export (v0.9.0) |
| `src/components/pages/ManageUploadsPageClient.tsx` | `/setup` |
| `src/components/pages/DevToolsPageClient.tsx` | `/dev-tools` |

## Setup / shared components

| File | Purpose |
|------|---------|
| `src/components/setup/AuthPanel.tsx` | Sign in / sign up / magic link / sign out |
| `src/components/setup/CloudFileStoragePanel.tsx` | Supabase original-file storage status |
| `src/components/setup/UploadCard.tsx` | DOCX upload dropzone |
| `src/components/setup/JDInputPanel.tsx` | JD intake + inline generate flow on `/generate` (v0.7.3) |
| `src/components/setup/GenerateTailoredResumeSection.tsx` | Base resume, CTA, progress, cover letter mode + advanced company fields (v0.9.0) |
| `src/components/setup/GenerationProgressPanel.tsx` | Staged loading UI during generation |
| `src/lib/generate/base-resume-preference.ts` | Last-used base resume (`localStorage`) + default resolution |
| `src/lib/generate/save-job-for-generation.ts` | Auto-save/reuse job on generate |
| `src/lib/generate/generation-progress.ts` | Progress stage labels + percent helper |
| `src/components/setup/ApplicationRecordsPanel.tsx` | Application cards: status, notes, linked draft + cover letter links (Records) |
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
| `src/components/setup/ui.tsx` | Shared cards, form/button classes, tabs, citation chips |

## Supabase (active persistence)

**Migration naming (SOP):** Files under `supabase/migrations/` must match Supabase CLI format `<timestamp>_human_readable_name.sql` (e.g. `20260619_add_resume_draft_metadata.sql`). Avoid milestone codes like `004a` or `4A` — those are skipped by `supabase db push`. See **Project SOPs** in `HANDOFF.md`.

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Tables, RLS, storage buckets and policies |
| `supabase/migrations/20260619_add_resume_draft_metadata.sql` | Adds resume draft metadata columns/indexes |
| `supabase/migrations/20260620_add_saved_job_summary.sql` | Adds `summary` column to `job_descriptions` |
| `supabase/migrations/20260622_application_communication_v090.sql` | Profile table + extended cover letter draft columns (v0.9.0) |
| `src/lib/supabase/generated-resume-drafts.ts` | Create/list/get/delete generated resume drafts |
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
| `src/components/resume-drafts/ResumeEvidenceRegenerationPanel.tsx` | Evidence inspect + regenerate controls (v0.7.7) |
| `src/lib/inventory/edits.ts` | Inventory edit overlay helpers (v0.7.7) |
| `src/lib/inventory/active-collated.ts` | Active collated view for generation (v0.7.7) |
| `src/lib/resume-draft/regeneration.ts` | Regeneration feasibility + source key helpers (v0.7.7) |
| `src/types/inventory-edits.ts` | `InventoryEdits` overlay type (v0.7.7) |
| `src/lib/resume-draft/bullet-payload.ts` | Bullet ranking/cap/force/exclude selection (v0.7.7) |
| `src/lib/resume-draft/enrichment-wording.ts` | Accepted enrichment wording lookup by bulletKey (v0.7.6) |
| `src/lib/resume-draft/prompt.ts` | Resume draft generation prompt |
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
| `src/lib/resume-draft/pdf-export.ts` | Puppeteer PDF generation from document model (v0.6.2) |
| `src/lib/supabase/resume-pdf-storage.ts` | PDF upload to `generated-documents` (v0.6.2) |
| `src/app/api/export/resume-pdf/route.ts` | POST PDF export API (v0.6.2) |
| `src/lib/resume-draft/docx-font.ts` | DOCX font + px→pt mapping (v0.6.1+) |
| `src/lib/resume-draft/docx-layout-helpers.ts` | Company line segments + layout constants (v0.6.1) |
| `src/lib/resume-draft/docx-export.ts` | DOCX generation from document model (v0.6.0+) |
| `src/lib/resume-draft/export-filename.ts` | Export filename + storage path helpers (v0.6.0) |
| `src/lib/resume-draft/export-request.ts` | Export API request validation (v0.6.0) |
| `src/lib/resume-draft/export-client.ts` | Browser client for DOCX export API (v0.6.0) |
| `src/lib/supabase/server-client.ts` | Supabase client from user access token (v0.6.0) |
| `src/lib/supabase/resume-docx-storage.ts` | Upload exported DOCX to storage (v0.6.0) |
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

## Application communication / cover letter (v0.9.0)

| File | Purpose |
|------|---------|
| `src/lib/firecrawl/scrape-company-website.ts` | Firecrawl scrape helper (v0.9.5) |
| `src/lib/firecrawl/url.ts` | Company website URL validation + job board detection |
| `src/lib/company-context/research.ts` | Firecrawl + Gemini research orchestration (v0.9.5) |
| `src/lib/ai/config.ts` | `GEMINI_MODEL_PRIMARY` / `GEMINI_MODEL_FALLBACK` env overrides |
| `src/lib/company-context/ensure-for-generation.ts` | Auto-generate + save when missing (v0.9.4) |
| `src/lib/company-context/status-labels.ts` | Compact UI status labels (v0.9.4) |
| `src/lib/company-context/prompt.ts` | Gemini company context prompt (no web search) |
| `src/lib/company-context/parse.ts` | JSON parse + save validation |
| `src/lib/company-context/normalize.ts` | Legacy → v0.9.3 shape + prompt formatting |
| `src/lib/company-context/resolve-for-generation.ts` | Saved context or JD fallback |
| `src/lib/company-context/client.ts` | Browser client for generate-company-context API |
| `src/lib/company-context/gemini-call-map.ts` | Static end-to-end Gemini call audit |
| `src/lib/ai/company-context-gemini.ts` | Gemini company context provider |
| `src/components/company-context/CompanyContextEditorPanel.tsx` | Generate page editor (v0.9.3) |
| `src/components/company-context/CompanyContextPreviewPanel.tsx` | Cover letter preview collapsible context (v0.9.3) |
| `src/lib/cover-letter/prompt.ts` | Cover letter generation prompt + tone/length rules |
| `src/lib/cover-letter/word-limits.ts` | 420-word hard max + target range (v0.9.2) |
| `src/lib/cover-letter/company-name.ts` | Company display name normalization (v0.9.2) |
| `src/lib/cover-letter/banned-phrases.ts` | Banned AI-ish phrase detection (v0.9.2) |
| `src/lib/cover-letter/revision-prompt.ts` | Quick revision prompt + action labels (v0.9.2) |
| `src/lib/cover-letter/revision-parse.ts` | Revision JSON parse + validation (v0.9.2) |
| `src/lib/cover-letter/revision-client.ts` | Browser client for revise-cover-letter API (v0.9.2) |
| `src/lib/ai/revise-cover-letter-provider.ts` | Revision provider selection (v0.9.2) |
| `src/components/cover-letters/CoverLetterQuickRevisionPanel.tsx` | Quick adjustment buttons (v0.9.2) |
| `src/lib/cover-letter/parse.ts` | Parse model JSON (formal + secondary formats) |
| `src/lib/cover-letter/generation-validation.ts` | Word count + required formal letter validation |
| `src/lib/cover-letter/resume-evidence.ts` | Resume draft → evidence spine for prompt |
| `src/lib/cover-letter/client.ts` | Browser client for generate-cover-letter API |
| `src/lib/cover-letter/export-client.ts` | Browser client for cover letter PDF/DOCX export |
| `src/lib/cover-letter/pdf-html.ts` | Simple professional letter HTML |
| `src/lib/cover-letter/pdf-export.ts` | Puppeteer PDF for cover letter |
| `src/lib/cover-letter/docx-export.ts` | DOCX for cover letter |
| `src/lib/ai/cover-letter-provider.ts` | Cover letter provider selection |
| `src/lib/ai/cover-letter-mock.ts` | Mock cover letter provider (tests) |
| `src/lib/ai/cover-letter-gemini.ts` | Gemini cover letter provider |
| `src/lib/generate/cover-letter-generation.ts` | Orchestrate context + AI + Supabase save |
| `src/components/cover-letters/DownloadCoverLetterPdfButton.tsx` | Download PDF button |
| `src/components/cover-letters/DownloadCoverLetterDocxButton.tsx` | Download DOCX button |
| `src/components/cover-letters/SecondaryCommunicationsPanel.tsx` | Email/LinkedIn/DM/WhatsApp copy blocks |
| `src/components/cover-letters/ResumeCoverLetterPanel.tsx` | Resume preview: generate/link cover letter |

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

| Script | Purpose |
|--------|---------|
| `scripts/verify-parser.ts` | Parser smoke tests |
| `scripts/verify-inventory.ts` | Inventory CRUD |
| `scripts/verify-duration.ts` | Duration + inventory validation helpers |
| `scripts/verify-collation.ts` | Collation + splitting |
| `scripts/verify-education.ts` | Education parsing + collation |
| `scripts/verify-section-detection.ts` | Section detection + unparsed fallbacks |
| `scripts/verify-enrichment.ts` | Enrichment state + JSON round-trip (test helpers) |
| `scripts/verify-jd.ts` | JD pure helpers + JSON round-trip (test helpers) |
| `scripts/verify-files.ts` | File hash + metadata |
| `scripts/verify-resume-draft.ts` | Resume draft payload, prompt, parser (no live AI/Supabase) |
| `scripts/verify-inventory-edits.ts` | Hidden/edited overlay + regeneration payload (v0.7.7) |
| `scripts/verify-application-records.ts` | Application shell wiring + types (v0.8.0) |
| `scripts/verify-cover-letter.ts` | Profile, payload, prompt, validation, persistence (v0.9.0) |
| `scripts/verify-cover-letter-quality.ts` | Word cap, banned phrases, normalization, revision (v0.9.2) |
| `scripts/verify-generation-payload.ts` | Accepted wording, bullet ranking/cap, keyword rules (v0.7.7) |
| `scripts/verify-resume-draft-review.ts` | Draft review state + preview apply (4B) |
| `scripts/verify-resume-draft-layout.ts` | Layout order, fit score, keyword bullets (v0.5.1+) |
| `scripts/verify-resume-docx-export.ts` | Document model + filename + DOCX buffer tests (v0.6.0) |
| `scripts/verify-resume-pdf-export.ts` | PDF HTML + filename + export request tests (v0.6.2+) |
| `scripts/verify-resume-layout-parity.ts` | Preview/PDF spacing + settings persistence tests (v0.6.3) |
| `scripts/verify-resume-export-strategy.ts` | Export strategy + download behavior + PDF Preview tests (v0.6.4) |
| `scripts/verify-draft-inventory-safety.ts` | Draft edit paths must not mutate inventory (v0.5.4+) |
| `scripts/verify-supabase.ts` | Supabase pure helpers (no live project) |

## Documentation

| File | Purpose |
|------|---------|
| `docs/FIT_SCORE_RUBRIC.md` | Target fit-score rubric (`fit-rubric-v1`) — product IP |
| `RESUME_FIT_SCORE_BRIEF.md` | Pointer to `docs/FIT_SCORE_RUBRIC.md` |
| `HANDOFF.md` | Current milestone and run instructions |
| `KNOWN_ISSUES.md` | Known limitations |
| `TEST_CHECKLIST.md` | Manual QA checklist |
