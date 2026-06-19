# HANDOFF

## Current milestone

**v0.6.3 — Preview/PDF Layout Parity Fixes**

Preview, PDF HTML, and DOCX now share spacing constants and uppercase candidate names. Approved layout settings persist on the draft for Records exports.

## Product flow

```
Paste JD → Generate Resume → One-page preview → Approve for Export → Download DOCX / Download PDF
```

Cover letters and manual inventory editing deferred.

## v0.6.3 highlights

**Layout parity:** `resume-layout-styles.ts` — shared spacing, line-height, bullet margins for preview + PDF HTML

**Uppercase name:** `formatCandidateDisplayName()` at render/export time only (stored profile unchanged)

**Settings persistence:** `content.exportLayoutSettings` saved on Approve; Records export uses stored settings; preview page override wins when sliders change

**PDF debug:** Collapsible “PDF layout HTML (debug)” on preview page

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.2 — Direct PDF export | Complete |
| **v0.6.3 — Preview/PDF parity** | **Current** |
| v0.7.0 — Cover letter generation | Next |
| Manual inventory editing | Deferred |

## Run

```bash
npm run dev
npm run test
```
