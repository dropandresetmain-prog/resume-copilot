# HANDOFF

## Current milestone

**v0.8.0 — Application Shell**

Minimal application workflow spine: generate creates/reuses an `application_records` row per job, links `generated_resume_drafts.application_id`, Records page shows Applications (status, notes, latest draft) above legacy unlinked Draft History.

## v0.7.8 highlights

Inventory edit UX hardening — draft edits lifted to page level, unsaved banner, save feedback, `SetupAlerts` on `/inventory`, immediate cloud save on inventory edits.

## v0.7.7 highlights

Non-destructive inventory edit overlay (`hiddenBulletKeys`, `editedBulletTextByBulletKey`), Edit Bullets tab on Inventory, evidence/regeneration panel on resume preview, regeneration updates the same draft row.

## Product flow

```
Paste JD → Select base resume → Generate Tailored Resume → Application record (status / notes)
  → Review → PDF Preview → Approve → Download PDF / DOCX
```

If layout changes after approval → status `layout_changed` → re-approve (re-validates server PDF).

## Application workflow (v0.8.0)

- **Generate** creates or reuses one application per saved job (`job_description_id`).
- New drafts link via `generated_resume_drafts.application_id`.
- Application status set to `resume_generated` after successful generate.
- **Records** → Applications: update status, edit notes, open latest linked draft.
- **Draft History** below shows only **unlinked** legacy drafts (no data loss).

Statuses: `drafting`, `resume_generated`, `ready_to_apply`, `applied`, `rejected`, `archived`.

## Roadmap

| Milestone | Status |
|-----------|--------|
| **v0.8.0 — Application shell** | **Current** |
| v0.7.8 — Inventory edit UX hardening | Complete |
| v0.7.7 — Inventory editing & regeneration | Complete |
| Cover letter generation | Next (after application shell stable) |
| Online company enrichment | Parked |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
