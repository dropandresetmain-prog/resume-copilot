# HANDOFF

## Current State
Milestone 2 is complete.

## Completed
- Milestone 1 resume inventory parsing and management (DOCX upload, collated inventory, export/import, layered parser).
- Interchangeable AI provider adapter (`mock`, `gemini`, `openai` placeholder).
- AI enrichment flow for collated work experience bullets.
- Review UI with structured review cards (issue, before, after, changes, rationale, risks, source, actions).
- Provider status banner (mock labeled as test-only; Gemini/OpenAI when configured).
- Duplicate bullet group review (keep all / group as variants / reject grouping).
- Approved keyword bank persisted separately from parsed resumes.
- Enrichment state persisted in localStorage and inventory JSON export (schema v2).
- Mock provider works without API keys.

## Known Issues / Risks
- Resume parsing is heuristic-based and may fail on unfamiliar resume formats.
- Mock provider is **test-only** (local rule-based output, not real AI). Cursor does not run enrichment.
- AI enrichment quality depends on provider; real AI requires `AI_PROVIDER=gemini` (or future `openai`) plus API key.
- OpenAI provider is a placeholder and not implemented yet.
- Original uploaded resume files are not stored; only parsed inventory JSON is persisted/exported.
- Collated bullet IDs are regenerated on each collation; enrichment uses stable `bulletKey` values.
- No JD parsing yet.
- No resume generation yet.
- No cover letter generation yet.
- No DOCX output generation yet.
- No Vercel deployment yet.

## What Not To Change
- Do not overwrite raw parsed resume text with AI suggestions.
- Do not make AI suggestions source-of-truth without user review.
- Do not store private resumes in Git.
- Do not add database/auth unless explicitly requested.

## Next Milestone
Job description parsing and resume tailoring:
- Parse JD requirements into structured targets.
- Match inventory items against JD keywords.
- Suggest resume assembly from approved inventory (still reviewable).

## Key files
- `src/lib/ai/provider.ts` — provider selection and enrichment entry point
- `src/lib/ai/mock.ts` — local mock provider (no API key)
- `src/lib/enrichment/normalize.ts` — legacy suggestion → review-card field migration
- `src/lib/enrichment/state.ts` — suggestion review and keyword bank logic
- `src/app/api/ai/enrich/route.ts` — server enrichment endpoint
- `src/components/setup/EnrichmentReviewPanel.tsx` — review UI
- `src/types/enrichment.ts` — enrichment types

## Run
```bash
cp .env.example .env.local
npm run dev
npm run test
```

Set `AI_PROVIDER=mock` in `.env.local` for local development without API keys. The enrichment panel banner will label output as mock/test suggestions until Gemini or OpenAI is configured.
