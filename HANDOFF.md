# HANDOFF

## Current milestone

**v0.4.3 — Profile Contact Backfill**

Safe one-time backfill adds missing `profile` (`ParsedProfileContact`) to existing saved inventories using preserved unparsed/preamble text only. Does not re-parse resumes or touch cleaned experience data.

**4B not started.**

## Completed in v0.4.3

- `backfillProfileContactForInventory()` in `src/lib/inventory/backfill-profile-contact.ts`
- Setup UI: **Backfill profile/contact from existing resumes** (manual action, not on load)
- Saves to Supabase only when changed and signed in

## Completed earlier

- v0.4.2 — Profile parsing, Saved Jobs UX, enrichment stability
- v0.4.1 — Auth + enrichment review hardening
- v0.4.0 / 4A — AI resume draft generation

## Backfill behavior

Sources (conservative):

- Unparsed `Document preamble` sections
- Unparsed sections whose title looks like a person name (e.g. `HSET MIN HTET`)

Skips when:

- `resume.profile.fullName` already exists
- No confident profile from preserved text

Mutates only per resume:

- `profile` (add)
- `unparsedSections` (remove matched header section only)
- `parseWarnings` (remove matched preamble/unknown-section warnings)

Never mutates: experiences, education, skills, enrichment, keyword bank.

## Project SOPs

Migration filenames must match Supabase CLI format: `<timestamp>_human_readable_name.sql`

## Run

```bash
npm run dev
npm run test
```

After deploying, open `/setup`, sign in, click **Backfill profile/contact from existing resumes** once if your cloud inventory predates v0.4.2.
