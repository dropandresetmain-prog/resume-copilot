# HANDOFF

## Current State
Milestone 1 is complete.

## Completed
- Next.js app scaffolded with TypeScript, Tailwind, ESLint, App Router, and Turbopack.
- Resume upload flow created.
- DOCX resume parsing implemented with a layered parser (section detection → profile-based extraction → unparsed fallbacks).
- Upload management added: delete resume, clear all, duplicate filename replacement.
- Parsed inventory persistence added using browser localStorage.
- Inventory export/import JSON added.
- Collated Inventory view added as the default working view.
- Source Resumes / Debug view preserved for per-resume inspection.
- Work experience parsing supports company, descriptor, location, role, date range, duration, keyword-prefixed bullets, and source citations.
- Education parsing simplified to institution, programme(s), location, date range, bullets, raw text, and source citations.
- Additional Experience preserved as loose structured text with category, item text, raw text, and source citations.
- Skills & Interest split into reusable language, technical skill, interest, and other items.
- Unparsed / Needs Review sections preserve raw text and warnings for unfamiliar formats.
- UI improved into a cleaner setup dashboard.
- Documentation updated.

## Known Issues / Risks
- Resume parsing is heuristic-based and may fail on unfamiliar resume formats.
- Current parser is optimized for the user's existing resume format but should fail safely by preserving raw text and warnings.
- PDF support is not yet implemented unless already present in the codebase.
- Original uploaded resume files are not stored; only parsed inventory JSON is persisted/exported.
- No AI enrichment yet.
- No JD parsing yet.
- No resume generation yet.
- No cover letter generation yet.
- No DOCX output generation yet.
- No Vercel deployment yet.

## What Not To Change
- Do not add AI provider logic before the AI adapter milestone.
- Do not add database/auth unless explicitly requested.
- Do not store private resumes in Git.
- Do not overwrite raw parsed text during enrichment later.
- Do not make AI suggestions source-of-truth without user review.

## Next Milestone
AI Inventory Enrichment:
- Add interchangeable AI provider adapter.
- Add AI review for near-duplicate bullets.
- Suggest industry-standard keywords.
- Suggest capability tags.
- Build an approved keyword bank.
- Keep AI suggestions reviewable and non-destructive.

## Key files
- `src/lib/parser/pipeline.ts` — end-to-end parse orchestration
- `src/lib/parser/section-detection.ts` — section alias detection
- `src/lib/parser/profiles/two-line-column.ts` — primary work experience profile
- `src/lib/inventory/collation.ts` — collated inventory builder
- `src/components/setup/CollatedInventoryView.tsx` — default working view
- `src/components/setup/SourceResumesView.tsx` — per-resume debug view

## Run
```bash
npm run dev
npm run test
```
