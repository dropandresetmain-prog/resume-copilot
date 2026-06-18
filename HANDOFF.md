# HANDOFF

## Current State
Milestone 3C (Supabase-first storage migration) is complete.

## Completed
- Milestone 1 resume inventory parsing and management (DOCX upload, collated inventory, layered parser).
- Milestone 2 AI enrichment for collated work experience bullets (mock + Gemini providers, review cards, keyword bank).
- Milestone 2.1 Gemini small-batch test mode and hardened JSON handling.
- Milestone 3A job description intake.
- Milestone 3B JD polish (terminology, duplicate warnings, separate clear actions).
- **Milestone 3C Supabase-first storage**:
  - `@supabase/supabase-js` browser client with env validation
  - `supabase/schema.sql` — tables, RLS, private storage buckets
  - Auth panel (email/password, magic link, sign out)
  - Cloud services: resume inventories, job descriptions, stored files
  - Upload flow: parse → save inventory → upload original file (warn on file failure)
  - JD intake CRUD via Supabase
  - Removed localStorage/IndexedDB as source-of-truth; legacy local data warning only
  - Export/import removed from primary UI (pure helpers kept for tests)

## Storage model
| Layer | What | Source of truth? |
|-------|------|------------------|
| Supabase Postgres | Parsed inventory JSON, saved JDs, future application/draft metadata | Yes (signed-in users) |
| Supabase Storage | Original resume files, future generated DOCX/PDF | Yes (private buckets, RLS) |
| In-memory | Session state while signed out or Supabase unconfigured | Temporary only |

## Known Issues / Risks
- Resume parsing is heuristic-based and may fail on unfamiliar resume formats.
- Mock enrichment is test-only; real AI requires `AI_PROVIDER=gemini` plus API key.
- **Manual Supabase setup required**: run `schema.sql`, configure auth, set env vars.
- No automatic migration from old localStorage data — users must re-upload/re-save.
- Deleting a parsed resume does not yet delete its Supabase Storage blob (orphan files possible).
- Generated resume/cover letter tables exist in schema but are not implemented in UI.
- No resume generation yet.
- No cover letter generation yet.

## What Not To Change
- Do not overwrite raw parsed resume text with AI suggestions.
- Do not add JD enrichment/review cards — JD intake is raw text only for now.
- Do not store private resumes in Git.
- Do not expose Supabase service role key in the frontend.

## Next Milestone
**Milestone 3D — Application Records**

Wire `application_records` table to UI:
- company, role, job URL, selected saved JD
- status and notes
- links to future generated drafts and exported documents

After 3D, proceed to **Milestone 4A — AI Resume Draft Generation**.

## Key files
- `supabase/schema.sql` — database and storage setup
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/resume-inventories.ts` — cloud inventory CRUD
- `src/lib/supabase/job-descriptions.ts` — cloud JD CRUD
- `src/lib/supabase/files.ts` — storage upload/download
- `src/components/setup/AuthPanel.tsx` — authentication UI
- `src/components/SetupPageClient.tsx` — main setup orchestration
- `src/lib/inventory/persistence.ts` — pure validation, export/import helpers (tests)

## Run
```bash
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
npm run test
```

Set `AI_PROVIDER=mock` in `.env.local` for local development without API keys.

Supabase service integration tests are not run in CI; `test:supabase` covers pure helpers only.
