# HANDOFF

## Current milestone

**v0.7.0 — One-Page Export Validation**

Server-generated PDF page count is export truth. Approve for Export runs Puppeteer + `pdf-lib` page count; export and download are blocked when `pageCount > 1`.

## Product flow

```
Paste JD → Generate → Review → PDF Preview (local approximation) → Approve (server validation) → Download PDF / DOCX
```

If layout changes after approval → status `layout_changed` → re-approve (re-validates server PDF).

## v0.7.0 highlights

- `generateResumePdfResult()` returns `{ buffer, pageCount }` via `pdf-lib`
- `/api/approve/resume-draft` — validates one page before persisting approval + `serverPdfValidation`
- `/api/validate/resume-pdf` — validation-only endpoint (same model builder)
- `/api/export/resume-pdf` — hard 422 gate when `pageCount > 1` (no upload)
- UI: server page count, heuristic estimate separate, PDF download requires server-validated one page

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.8 — Export delivery & filename | Complete |
| **v0.7.0 — One-page export validation** | **Current** |
| PDF density / underfill warnings | Next (optional) |
| Cover letter generation | After one-page foundation |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
