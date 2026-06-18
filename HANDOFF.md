# HANDOFF

## Current milestone

**v0.6.2 — Direct Resume PDF Export**

Approved drafts can download **DOCX** (Word) or **PDF** (direct HTML→PDF from canonical layout model). PDF does not depend on DOCX.

## Product flow

```
Paste JD → Generate Resume → One-page preview → Approve for Export → Download DOCX / Download PDF
```

Cover letters and manual inventory editing deferred.

## v0.6.2 highlights

**PDF strategy:** `ResumeDocumentModel` → `renderResumePdfHtml()` → Puppeteer (`puppeteer-core` + `@sparticuz/chromium` on Vercel; local Chrome fallback)

**Filename:** `<FULL NAME> - Resume_<COMPANY>_<ROLE>.pdf` (same stem as DOCX)

**Font hierarchy:** Header/name/section = body + 1pt (DOCX) / body + 1px (preview/PDF HTML)

**Company line:** Company bold; `(descriptor)` normal in preview, DOCX, and PDF

**Professional Summary:** Not rendered in resume preview/export; schema field kept empty for backward compatibility / future cover letters

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.0 — DOCX export | Complete |
| v0.6.1 — DOCX fidelity fixes | Complete |
| **v0.6.2 — Direct PDF export** | **Current** |
| v0.7.0 — Cover letter generation | Next |
| Manual inventory editing | Deferred |

## Run

```bash
npm run dev
npm run test
```

## PDF local dev

Set `LOCAL_CHROME_PATH` or install Google Chrome. On Vercel, `@sparticuz/chromium` is used automatically.
