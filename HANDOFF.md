# HANDOFF

## Current milestone

**v0.6.7 — PDF Preview Truth Patch**

PDF Preview no longer silently clips overflow at one A4 page. Puppeteer export awaits `document.fonts.ready` before print. Font parity across browser vs server remains a known gap until bundled web fonts or v0.7.0 validation.

## Product flow

```
Paste JD → Generate → Review → PDF Preview (truth) → Approve → Download PDF (primary) / DOCX (secondary)
```

If layout changes after approval → status `layout_changed` → re-approve before export.

## v0.6.7 highlights

- PDF Preview measures `.resume-pdf-a4-page` scroll height — overflow badge + dashed page-break line
- Iframe expands to full content height (no silent bottom clip); mobile scale-to-fit preserved
- Puppeteer: `waitForPdfDocumentFonts()` after `setContent` before `page.pdf()`
- UI copy: closest browser preview; server PDF may differ at line breaks until v0.7.0 page-count gate

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.6 — Generation rules & approval formatting | Complete |
| **v0.6.7 — PDF Preview truth patch** | **Current** |
| v0.7.0 — One-page enforcement foundation | Next (recommended) |
| Cover letter generation | After one-page foundation |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
