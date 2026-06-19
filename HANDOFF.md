# HANDOFF

## Current milestone

**v0.6.8 — Export Delivery & Filename Stabilization**

Export delivery uses one API request + one blob fetch + one anchor download with the intended filename. Avoids `window.open` on Supabase signed URLs (which caused tab + Downloads + Adobe stacking on some systems).

## Product flow

```
Paste JD → Generate → Review → PDF Preview (closest local approximation) → Approve → Download PDF (primary) / DOCX (secondary)
```

If layout changes after approval → status `layout_changed` → re-approve before export.

## v0.6.8 highlights

- PDF/DOCX desktop: `fetchExportBlob` → blob URL → single `<a download={fileName}>` click
- Supabase `createSignedUrl(..., { download: fileName })` for Content-Disposition on direct URL hits
- `ExportDeliveryMetrics` counters for verifying one API call per click
- PDF button remains **Download PDF** (download-first, not open-tab)

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.7 — PDF Preview truth patch | Complete |
| **v0.6.8 — Export delivery & filename** | **Current** |
| v0.7.0 — One-page enforcement foundation | Next |
| Cover letter generation | After one-page foundation |

See `ROADMAP.md`.

## Run

```bash
npm run dev
npm run test
```
