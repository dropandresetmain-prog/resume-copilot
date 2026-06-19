# HANDOFF

## Current milestone

**v0.6.5 — Preview Truth & Mobile Export Stabilization**

**PDF Preview** is the authoritative preview. Export APIs use the same `buildExportResumeDocumentModel` helper as the preview page (including reference resume typography). Mobile A4 preview scales proportionally; mobile exports use same-tab navigation.

## Product flow

```
Paste JD → Generate → Review → PDF Preview (truth) → Approve → Download PDF (primary) / DOCX (secondary)
```

## v0.6.5 highlights

- Shared `buildExportResumeDocumentModel` for preview + export API parity
- PDF Preview primary; React layout preview demoted to Advanced
- Mobile A4 scale-to-fit iframe preview
- Mobile-safe PDF/DOCX delivery (`same-tab-navigate` + user hint)
- Layout controls adjacent to PDF Preview; `marginTopMm` slider; line-spacing min 0.95
- `ROADMAP.md` added

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.4 — Export strategy stabilization | Complete |
| **v0.6.5 — Preview truth & mobile export** | **Current** |
| v0.7.0 — One-page enforcement foundation | Next (recommended) |
| Cover letter generation | After one-page foundation |
| Manual inventory editing | Deferred |

See `ROADMAP.md` for phased detail.

## Run

```bash
npm run dev
npm run test
```
