# Project File Map

## App routes

| Path | File |
|------|------|
| `/` | `src/app/page.tsx` |
| `/setup` | `src/app/setup/page.tsx` |

## Setup page

| File | Purpose |
|------|---------|
| `src/components/SetupPageClient.tsx` | State, tabs, persistence, export/import |
| `src/components/setup/UploadCard.tsx` | Upload dropzone + actions |
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

## Inventory logic

| File | Purpose |
|------|---------|
| `src/lib/inventory/inventory.ts` | Upsert, delete, counts |
| `src/lib/inventory/persistence.ts` | localStorage, export/import |
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
| `scripts/verify-duration.ts` | Duration + persistence |
| `scripts/verify-collation.ts` | Collation + splitting |
| `scripts/verify-education.ts` | Structured education parsing + collation |
| `scripts/verify-section-detection.ts` | Layered section detection + unparsed fallbacks |
