# HANDOFF

## Current milestone

**v0.3.0 — Supabase Foundation** (internal milestone 3C)

Supabase-first persistence is complete. The app requires sign-in for cloud sync when Supabase is configured.

## Completed

- Milestone 1: DOCX parsing, collated inventory, layered parser
- Milestone 2 / 2.1: AI enrichment (mock + Gemini), review cards, keyword bank, small-batch test
- Milestone 3A–3B: Job description intake, duplicate warnings, separate clear actions
- **v0.3.0 Supabase Foundation**:
  - `@supabase/supabase-js` browser client
  - `supabase/schema.sql` — Postgres tables, RLS, private storage buckets
  - Auth panel (email/password, magic link, sign out)
  - Cloud services: resume inventories, job descriptions, stored files
  - Upload: parse → save inventory → upload original file (warn on file failure)
  - JD CRUD via Supabase
  - Removed localStorage/IndexedDB as active persistence
  - Legacy browser-data warning only (no migration)
  - Export/import removed from UI; JSON helpers kept for unit tests only

## Storage model

| Layer | What | Source of truth? |
|-------|------|------------------|
| Supabase Postgres | Inventory JSON, saved JDs, schema-ready application/draft tables | Yes (signed-in users) |
| Supabase Storage | Original resume files; future generated documents | Yes (private buckets + RLS) |
| In-memory | Session state while signed out or Supabase unconfigured | Temporary only |

## Known risks

- Resume parsing is heuristic-based; unfamiliar formats may fail.
- Mock enrichment is test-only; real AI needs `AI_PROVIDER=gemini` + API key.
- **Manual Supabase setup required**: run `schema.sql`, configure auth redirect URLs, set env vars.
- **RLS and storage policies** must be verified manually after schema deploy.
- **No automatic migration** from pre-Supabase `localStorage` data.
- **Deleting a parsed resume** does not yet delete its Supabase Storage blob (orphan files possible).
- **`application_records`** — schema only, not wired to UI.
- **`generated_resume_drafts` / `generated_cover_letter_drafts`** — schema only.
- **`generated-documents` bucket** — schema only; no DOCX/PDF generation yet.
- AI resume generation, cover letter generation, and document export are **not built**.

## What not to change

- Do not overwrite raw parsed resume text with AI suggestions.
- Do not add JD enrichment/review cards — JD intake is raw text only for now.
- Do not store private resumes in Git.
- Do not expose the Supabase **service role** key in the frontend.

## Next milestones

1. **3D — Application Records UI** — wire `application_records` to the setup flow (link saved JD, status, notes).
2. **4A — AI Resume Draft Generation** — use inventory + JD to produce reviewable resume drafts.

## Key files

| Area | Path |
|------|------|
| Schema | `supabase/schema.sql` |
| Supabase client | `src/lib/supabase/client.ts` |
| Cloud inventory | `src/lib/supabase/resume-inventories.ts` |
| Cloud JDs | `src/lib/supabase/job-descriptions.ts` |
| Cloud files | `src/lib/supabase/files.ts` |
| Auth UI | `src/components/setup/AuthPanel.tsx` |
| Main orchestration | `src/components/SetupPageClient.tsx` |
| Validation helpers (tests) | `src/lib/inventory/persistence.ts`, `src/lib/jd/persistence.ts` |
| Legacy detection | `src/lib/legacy/local-data.ts` |

## Removed (do not restore as active persistence)

- `src/lib/storage/indexed-db.ts` (Dexie)
- `src/components/setup/FileStorageStatusPanel.tsx`

## Run

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
npm run test
```

`test:supabase` covers pure helpers only. Live Supabase integration requires a configured project and authenticated session.

Set `AI_PROVIDER=mock` in `.env.local` for development without API keys.
