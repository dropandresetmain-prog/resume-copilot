# Roadmap

Lightweight product roadmap — avoid backlog bloat. See `HANDOFF.md` for current milestone details.

## Current milestone

**v0.8.0 — Application Shell**

- `application_records` linked to JD + generated resume drafts
- Generate flow creates/reuses application per job
- Records page: Applications panel (status, notes, latest draft) + unlinked Draft History

## Previous

**v0.7.8 — Inventory Edit UX Hardening**

- Draft edits survive tab switches; save feedback; persistence warnings on Inventory

**v0.7.7 — Inventory Editing MVP & Resume Regeneration Controls**

- Non-destructive `InventoryState.edits` overlay (hide/edit bullets without mutating uploads)
- Edit Bullets tab + collated view respects active inventory
- Resume preview: evidence panel, force/exclude bullets, regenerate same draft row

## Previous

**v0.7.6 — Generation Input Quality Foundation**

- One card: JD paste + base resume + Generate + progress
- Saved jobs separated by divider below primary action

## Next

**Cover letter generation** — after application shell is stable in production use.

**PDF density / underfill warnings** — warn when one-page PDF uses page poorly (no auto-expand yet).

## Build after one-page

| Item | Notes |
|------|--------|
| Hybrid content compression | Evidence-backed, user-visible diffs — not AI auto-shrink |
| Full fit rubric (`fit-rubric-v1`) | Replace `preview-fit-heuristic-v1` |
| Bundled web font | Reduce preview vs server line-break drift |
| Evidence Library (narrative store) | Separate from inventory; for cover letters + outreach |

## Future vision only

- HTML→DOCX unified renderer
- Email export delivery
- Full ATS CRM / kanban
