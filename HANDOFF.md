# HANDOFF

## Current milestone

**v0.5.0 — Resume Draft Review UI (4B)**

Generated resume drafts now render as a readable preview with section-by-section review, inline edits, rationale/risk flags, and **Mark as reviewed** persistence to Supabase. Source inventory is never modified.

## Review flow (`/generate`)

1. Paste/save job → generate resume
2. Readable **Generated resume preview** (default, not JSON)
3. **Review generated sections** — accept / edit / omit per item
4. **Mark as reviewed** → saves edited `content` + `status: reviewed` to `generated_resume_drafts`

## Roadmap status

| Milestone | Status |
|-----------|--------|
| 4A — AI resume draft generation | Complete |
| 4B — Resume draft review UI | **Complete (v0.5.0)** |
| 4C — Draft management | Not started |
| 5A — Cover letter generation | Not started |
| 6A/6B/6C — PDF/DOCX export | Not started |

## Review model

- Local `ResumeDraftReviewState` tracks per-item status: `pending` \| `accepted` \| `edited` \| `rejected`
- Preview uses `applyReviewStateToContent()` — rejected items omitted, edits applied
- On **Mark as reviewed**, reviewed content is written to the draft row only
- Parsed resume inventory and enrichment are untouched

## Records (`/records`)

- Draft history list with **View resume preview** (read-only preview)
- Full draft management (4C) deferred

## Prior milestones

- v0.4.5 — Generate page flow + saved job UX
- v0.4.4 — Page split + navigation
- v0.4.0–4A — Resume draft generation pipeline

## Run

```bash
npm run dev
npm run test
```
