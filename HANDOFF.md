# HANDOFF

## Current milestone

**v0.4.1 — Auth + Enrichment Review Hardening**

Magic link sign-in is visible on mobile. Enrichment duplicate review shows existing vs AI wording with explicit resolution actions. Default enrichment is incremental; full re-run requires confirmation.

**v0.4.0 / 4A** (resume draft generation) remains complete. **4B not started.**

## Completed in v0.4.1

- AuthPanel: always-visible Password / Magic link / Sign up tabs
- Duplicate/similar enrichment: side-by-side comparison, Keep existing / Use AI suggestion / Reject / Ignore
- Incremental enrichment default (`Enrich missing items only`)
- Full re-run with confirmation dialog
- Merge dedupes reviewed suggestions and duplicate groups client-side
- `resolveSuggestionResolution` stores derived `acceptedWording` without mutating parsed resumes

## Storage model

| Layer | What |
|-------|------|
| Supabase Postgres | Inventory JSON, JDs, generated resume drafts |
| Supabase Storage | Original resume files |
| In-memory | Session-only when signed out |

## Known risks

- Manual merge/edit for enrichment suggestions is deferred (see KNOWN_ISSUES.md).
- Incremental enrichment skips entire bullets with any reviewed suggestion — not per-issue-type yet.
- Resume draft API is not session-authenticated (same as enrichment API).
- Run `supabase db push` (or apply `supabase/migrations/20260619_add_resume_draft_metadata.sql`) on existing Supabase projects if not done.

## What not to change

- Do not mutate `resume_inventories` parsed resume text from enrichment or draft generation.
- No service role key in frontend.

## Next milestones

1. **4B — Resume Draft Review UI**
2. **4C — Draft Management**
3. **3D — Application Records**

## Project SOPs

### Migration and artifact naming

Supabase CLI requires migration filenames to match:

`<timestamp>_human_readable_name.sql`

Example: `20260619_add_resume_draft_metadata.sql`

Use names that describe the business or technical change. Milestone labels (4A, 3C, etc.) belong in planning docs — not in filenames.

**Do**

- `20260619_add_resume_draft_metadata.sql`
- `20260620_add_application_records_status_fields.sql`

**Do not**

- `004a_resume_draft_extensions.sql` (internal milestone shorthand; ignored by `supabase db push`)
- `m4a.sql`
- `phase_3c_patch.sql`

## Run

```bash
cp .env.example .env.local
npm run dev
npm run test
```

Set `AI_PROVIDER=mock` for local enrichment and draft generation without Gemini.
