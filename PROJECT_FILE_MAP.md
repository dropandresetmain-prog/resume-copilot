# Project File Map

## App routes

| Path | File | Purpose |
|------|------|---------|
| `/` | `src/app/page.tsx` | Landing page |
| `/setup` | `src/app/setup/page.tsx` | Main setup UI (renders `SetupPageClient`) |
| `/api/ai/enrich` | `src/app/api/ai/enrich/route.ts` | Server-side AI enrichment |
| `/api/ai/generate-resume` | `src/app/api/ai/generate-resume/route.ts` | Server-side resume draft generation (4A) |

## Setup page components

| File | Purpose |
|------|---------|
| `src/components/SetupPageClient.tsx` | Auth session, Supabase sync, upload, enrichment orchestration |
| `src/components/setup/AuthPanel.tsx` | Sign in / sign up / magic link / sign out |
| `src/components/setup/CloudFileStoragePanel.tsx` | Supabase original-file storage status |
| `src/components/setup/UploadCard.tsx` | DOCX upload dropzone |
| `src/components/setup/ResumeDraftPanel.tsx` | Generate resume draft (4A) |
| `src/components/setup/JDInputPanel.tsx` | Job description intake and saved JD list |
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
| `supabase/migrations/20260619_add_resume_draft_metadata.sql` | Adds resume draft metadata columns/indexes (`reference_resume_id`, `input_snapshot`, `status`, `schema_version`) |
| `src/lib/supabase/generated-resume-drafts.ts` | Create/list/get/delete generated resume drafts |
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
| `src/lib/enrichment/client.ts` | Browser client for enrichment API |

## AI resume draft (4A)

| File | Purpose |
|------|---------|
| `src/lib/ai/resume-draft-provider.ts` | Resume draft provider selection |
| `src/lib/ai/resume-draft-mock.ts` | Mock resume draft provider |
| `src/lib/ai/resume-draft-gemini.ts` | Gemini resume draft provider |
| `src/lib/resume-draft/payload.ts` | Inventory + JD + reference resume → AI input + snapshot |
| `src/lib/resume-draft/prompt.ts` | Resume draft generation prompt |
| `src/lib/resume-draft/parse.ts` | Parse and map model JSON |
| `src/lib/resume-draft/client.ts` | Browser client for generate-resume API |

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
| `scripts/verify-supabase.ts` | Supabase pure helpers (no live project) |
