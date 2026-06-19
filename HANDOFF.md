# HANDOFF

## Current milestone

**v0.6.4 — Export Strategy Stabilization**

**PDF** is the primary final deliverable (canonical print HTML → Puppeteer). **DOCX** is an editable secondary output — Word may reflow and exceed one page.

## Product flow

```
Paste JD → Generate → Tune layout → PDF Preview → Approve → Download PDF (primary) / DOCX (secondary)
```

## v0.6.4 highlights

**Download behavior:** PDF opens in new tab; DOCX uses anchor download

**PDF Preview:** Iframe on preview page showing exact `renderResumePdfHtml()` output

**Print CSS:** `RESUME_PRINT_LAYOUT_SPACING` — compact, deterministic PDF layout (separate from browser layout preview)

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.3 — Preview/PDF parity | Complete |
| **v0.6.4 — Export strategy stabilization** | **Current** |
| v0.7.0 — Cover letter generation | Next |

## Run

```bash
npm run dev
npm run test
```
