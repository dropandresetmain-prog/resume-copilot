# HANDOFF

## Current milestone

**v0.7.2 — Generate Flow UX Simplification**

Generate page flow is now: paste JD → select base resume → **Generate Tailored Resume**. Jobs save automatically during generation; no separate Save Job click on Generate.

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
| **v0.7.2 — Generate flow UX** | **Current** |
| Cover letter generation | Next (same CTA family) |
| Online company enrichment | Parked |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
