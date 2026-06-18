# Project File Map

## App routes

| Path | File |
|------|------|
| `/` | `src/app/page.tsx` |
| `/setup` | `src/app/setup/page.tsx` |
| `/api/ai/enrich` | `src/app/api/ai/enrich/route.ts` |

## Setup page

| File | Purpose |
|------|---------|
| `src/components/SetupPageClient.tsx` | State, tabs, Supabase sync, enrichment |
| `src/components/setup/AuthPanel.tsx` | Sign in / sign out |
| `src/components/setup/CloudFileStoragePanel.tsx` | Supabase original file storage status |
| `src/components/setup/JDInputPanel.tsx` | Job description intake and saved JD list |
| `src/components/setup/EnrichmentReviewPanel.tsx` | AI suggestion review UI |
| `src/components/setup/UploadCard.tsx` | Upload dropzone + clear inventory |
| `src/components/setup/SummaryCards.tsx` | Per-resume summary stats |
| `src/components/setup/ResumeList.tsx` | Uploaded resume management |
| `src/components/setup/CollatedInventoryView.tsx` | Default collated working view |
| `src/components/setup/SourceResumesView.tsx` | Per-resume debug view |
| `src/components/setup/ParsedInventorySection.tsx` | Debug parsed section list |
| `src/components/setup/InventoryResumeCard.tsx` | Collapsible per-resume debug card |
| `src/components/setup/EducationCard.tsx` | Education card (parsed + collated) |
| `src/components/setup/UnparsedSectionCard.tsx` | Unparsed / needs review section UI |
| `src/components/setup/ExperienceCard.tsx` | Work experience card (debug) |
| `src/components/setup/SetupAlerts.tsx` | Errors and warnings |
| `src/components/setup/ui.tsx` | Shared UI primitives, tabs, citation chips |

## Types

| File | Purpose |
|------|---------|
| `src/types/resume.ts` | Parsed resume / inventory types |
| `src/types/collated.ts` | Derived collated inventory types |
| `src/types/enrichment.ts` | AI enrichment and keyword bank types |
| `src/types/jd.ts` | Job description intake types |
| `src/types/files.ts` | Stored file metadata types |

## Supabase

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Tables, RLS, storage buckets and policies |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/auth.ts` | Auth helpers |
| `src/lib/supabase/types.ts` | Row/record types, bucket constants |
| `src/lib/supabase/resume-inventories.ts` | Cloud inventory load/save/delete |
| `src/lib/supabase/job-descriptions.ts` | Cloud JD CRUD |
| `src/lib/supabase/files.ts` | Storage upload/download/list/delete |

## Legacy / pure persistence helpers

| File | Purpose |
|------|---------|
| `src/lib/inventory/persistence.ts` | Validation, enrich, export/import helpers (tests) |
| `src/lib/jd/persistence.ts` | JD validation, duplicate detection, list helpers |
| `src/lib/legacy/local-data.ts` | One-time legacy localStorage detection |
| `src/lib/storage/file-hash.ts` | SHA-256 hash helper |
| `src/lib/storage/file-metadata.ts` | Metadata normalization and display helpers |

## Job descriptions

| File | Purpose |
|------|---------|
| `src/lib/jd/persistence.ts` | Pure helpers (duplicate detection, list transforms) |
| `src/lib/supabase/job-descriptions.ts` | Cloud CRUD |
| `src/components/setup/JDInputPanel.tsx` | Paste/save/edit/delete JD UI |

## AI enrichment

| File | Purpose |
|------|---------|
| `src/lib/ai/provider.ts` | Provider selection and enrichment entry point |
| `src/lib/ai/mock.ts` | Mock provider for local testing |
| `src/lib/ai/gemini.ts` | Gemini provider |
| `src/lib/ai/openai.ts` | OpenAI placeholder |
| `src/lib/enrichment/state.ts` | Suggestion review and keyword bank |
| `src/lib/enrichment/payload.ts` | Collated inventory → AI input |
| `src/lib/enrichment/prompt.ts` | AI prompt instructions |
| `src/lib/enrichment/normalize.ts` | Legacy → review-card field migration |
| `src/lib/enrichment/client.ts` | Browser client for enrichment API |

## Inventory logic

| File | Purpose |
|------|---------|
| `src/lib/inventory/inventory.ts` | Upsert, delete, counts |
| `src/lib/inventory/persistence.ts` | Validation, export/import helpers |
| `src/lib/inventory/collation.ts` | Build collated inventory |
| `src/lib/inventory/split-items.ts` | Atomic splitting for additional experience and skills |
| `src/lib/inventory/normalize.ts` | Merge keys, bullet similarity |

## Parser

| File | Purpose |
|------|---------|
| `src/lib/parser/section-detection.ts` | Layer 1 — generic section alias detection |
| `src/lib/parser/experience-parser.ts` | Layer 2 — profile orchestration + confidence |
| `src/lib/parser/profiles/two-line-column.ts` | Layer 3 — company/role column profile |
| `src/lib/parser/pipeline.ts` | End-to-end parse pipeline + unparsed fallbacks |
| `src/lib/parser/heuristics.ts` | Shared date/bullet/column primitives |
| `src/lib/parser/education.ts` | Education parsing heuristics |
| `src/lib/parser/sections.ts` | Section-scoped parsers (education, skills, text) |
| `src/lib/parser/docx-parser.ts` | DOCX parsing orchestration |

## Tests

| File | Purpose |
|------|---------|
| `scripts/verify-parser.ts` | Parser smoke tests |
| `scripts/verify-inventory.ts` | Inventory CRUD |
| `scripts/verify-duration.ts` | Duration + persistence helpers |
| `scripts/verify-collation.ts` | Collation + splitting |
| `scripts/verify-education.ts` | Structured education parsing + collation |
| `scripts/verify-section-detection.ts` | Layered section detection + unparsed fallbacks |
| `scripts/verify-jd.ts` | JD pure helpers, export/import v3 |
| `scripts/verify-files.ts` | File hash + metadata normalization |
| `scripts/verify-supabase.ts` | Supabase pure helpers (no live project) |
