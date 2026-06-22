# HANDOFF

## Current milestone

**v0.7.4 — Additional Experience Normalization Fix**

Plain/legacy Additional Experience strings (e.g. `BayCurrent Consulting – …`) are normalized to **Title: Detail** before generation validation hard-fails. Multiple plain items combine under **Other Past Roles**. Output/PDF still renders colon format.

## v0.7.3 highlights

Primary generate flow (paste JD, base resume, Generate Tailored Resume, progress) is consolidated in one card. Job saves only on Generate click.

## Product flow

```
Paste JD → Select base resume → Generate Tailored Resume → Review → PDF Preview → Approve → Download PDF / DOCX
```

If layout changes after approval → status `layout_changed` → re-approve (re-validates server PDF).

## v0.7.2 highlights

- **Generate Tailored Resume** primary CTA (resume only for now; copy future-proofs cover letter)
- Job auto-save/reuse via `ensureJobDescriptionForGeneration` (dedupes matching saved jobs)
- Base resume dropdown with last-used preference (`localStorage`) + recent draft fallback
- Staged generation progress panel (honest, non-exact timing)
- Records page unchanged: explicit Save job when editing saved jobs
- Disabled download buttons use default cursor (no not-allowed hover icon)

## v0.7.1 (still in force)

- Layout defaults, LLM guardrails, server one-page PDF validation

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.7.1 — Layout defaults & LLM guardrails | Complete |
| **v0.7.4 — Additional experience normalization** | **Current** |
| v0.7.3 — Generate box UX | Complete |
| Cover letter generation | Next (same CTA family) |
| Online company enrichment | Parked |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
