# HANDOFF

## Current milestone

**v0.4.4 — Page split + navigation**

The monolithic setup page is split into focused routes with shared app navigation. User-facing **Setup** is renamed **Manage Uploads** (route stays `/setup`). **Generate** is the main product page after inventory exists. **4B (Resume Draft Review UI) is not started.**

## Navigation order

1. **Generate** → `/generate`
2. **Inventory** → `/inventory`
3. **Records** → `/records`
4. **Manage Uploads** → `/setup`
5. **Dev Tools** → `/dev-tools` (maintenance only; last in nav)

## First-time vs returning users

- Not signed in or no uploaded inventory → start at **Manage Uploads** (`/setup`) for login, upload, and parsing.
- Signed in with inventory → **Generate** (`/generate`) is the intended main flow; simple banners/links on landing and Manage Uploads point users accordingly.
- No complex onboarding state machine yet.

## Page responsibilities

| Route | Label | Purpose |
|-------|-------|---------|
| `/generate` | Generate | JD + reference resume selection, draft generation, preview; placeholders for cover letter / export only |
| `/inventory` | Inventory | Collated/source views, enrichment review, keywords; no test-batch button |
| `/records` | Records | Saved jobs, basic generated draft history list |
| `/setup` | Manage Uploads | Auth, upload, resume list, warnings, cloud files, summary |
| `/dev-tools` | Dev Tools | Profile backfill, Test Gemini small batch |

## Shared shell

- `src/components/app/WorkspaceProvider.tsx` — session sync, inventory/JD state, handlers (React Context)
- `src/components/app/AppShell.tsx` + `AppNav.tsx` — mobile-friendly nav with active route styling
- `src/app/(workspace)/layout.tsx` — wraps all workspace routes

## Completed in v0.4.3

- `backfillProfileContactForInventory()` — now surfaced on **Dev Tools**, not Manage Uploads

## Completed earlier

- v0.4.2 — Profile parsing, Saved Jobs UX, enrichment stability
- v0.4.1 — Auth + enrichment review hardening
- v0.4.0 / 4A — AI resume draft generation

## Project SOPs

Migration filenames must match Supabase CLI format: `<timestamp>_human_readable_name.sql`

## Run

```bash
npm run dev
npm run test
```

Landing CTA: **Customize your resume now** → `/setup`. Returning users can use **Already set up? Go to Generate** → `/generate`.

Magic link redirect still uses `/setup` (Manage Uploads).
