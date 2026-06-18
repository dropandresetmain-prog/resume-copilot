# HANDOFF

## Current milestone

**v0.4.5 — Generate Page Flow Fixes and Saved Job Detail UX**

Generate owns job intake for resume tailoring. Records owns saved job/draft history. Landing page has one primary CTA. **4B (Resume Draft Review UI) is not started.**

## Generate page flow

1. Paste job description on `/generate` (**Add a job to tailor your resume**)
2. Save job (company/role heuristics + heuristic summary)
3. Select saved job + reference resume
4. **Tailor resume from saved job** → **Generate resume**

Records (`/records`) is secondary: **Manage saved jobs** + draft history. No primary paste intake there.

## Landing CTA

Single button: **Customize your resume now**

- Signed out or no inventory → `/setup` (Manage Uploads)
- Signed in with inventory → `/generate`

## Saved jobs

- Collapsed cards: Company — Role, dates, heuristic `summary` preview
- **View full job description** expands full `rawText` with line breaks preserved
- Migration: `supabase/migrations/20260620_add_saved_job_summary.sql` (`summary text`)

## Navigation (unchanged from v0.4.4)

Generate → Inventory → Records → Manage Uploads → Dev Tools

## Completed in v0.4.4

Page split, shared `WorkspaceProvider`, app shell navigation.

## Completed earlier

- v0.4.3 — Profile contact backfill (Dev Tools)
- v0.4.2 — Profile parsing, Saved Jobs UX, enrichment stability
- v0.4.0 / 4A — AI resume draft generation

## Project SOPs

Migration filenames: `<timestamp>_human_readable_name.sql`

## Run

```bash
npm run dev
npm run test
```

After deploy, run `supabase db push` if `20260620_add_saved_job_summary.sql` is not yet applied.
