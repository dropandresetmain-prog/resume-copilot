# HANDOFF

## Current milestone

**v0.5.3 — Resume Preview Fit and Ordering Fixes**

Preview ordering, typography, spacing, and overflow visibility tuned for export readiness. Work/education/additional experience render reverse-chronological at layout layer. Full resume content remains visible below the A4 one-page cutoff.

## Product flow

```
Generate → Final Resume Layout Preview → Approve for Export → (future DOCX/PDF)
                              ↘ Edit Resume Details → /resume-preview/[draftId]/edit
```

## Preview fit (v0.5.3)

- **Reverse chronological:** Work Experience, Education, Additional Experience (dated phrases) sorted latest-first at `buildFinalResumeLayout()` — source draft/inventory order unchanged.
- **Font size slider:** Body 7–12px (0.5px steps); header/section titles +0.5px only.
- **Tighter defaults:** Margins 12mm (top 9mm), line spacing 1.05, section spacing 0.6rem.
- **Lower slider mins:** Margins from 8mm, line spacing from 1.0, section spacing from 0.35rem.
- **Overflow visible:** A4 page grows with content; dashed boundary at 297mm marks one-page cutoff.
- **Reference font:** `buildReferenceResumeFormatProfile()` sets `fontFamily` (Calibri/Arial fallback until DOCX font parsing exists).

## Layout fidelity (v0.5.2)

Work/education line structure, bullet markers, underlined keyword labels, Skills/Languages/Interests compact lines — see prior milestone notes.

## Reference resume (formatting only)

Reference resume is a **formatting/template reference**, not a content source. Generated content comes from inventory, approved keywords, and job description.

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.5.1 — Final layout preview | Complete |
| v0.5.2 — Layout fidelity fixes | Complete |
| **v0.5.3 — Preview fit & ordering** | **Current** |
| v0.5.4 — Manual inventory editing | Planned (next) |
| v0.6.0 — DOCX export | Planned |
| v0.6.1 — PDF export | Planned |
| v0.7.0 — Cover letter generation | Planned |

## Approval

**Approve for Export** sets `generated_resume_drafts.status` to `approved` and saves draft content. Export not implemented yet.

## Run

```bash
npm run dev
npm run test
```
