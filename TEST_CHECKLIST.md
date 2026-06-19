# Test Checklist — v0.6.4 Export Strategy Stabilization

## Manual export flow

1. Open **Resume Preview** (`/resume-preview/[draftId]`)
2. Adjust layout sliders (font, margins, line/section spacing)
3. Check **PDF Preview** iframe — this is the exact print HTML/CSS for export
4. Compare layout preview vs PDF Preview; tune until PDF Preview looks right
5. **Approve for Export**
6. **Download PDF** — opens in new tab; confirm it matches PDF Preview
7. **Download DOCX** — saves file via download (not new tab); confirm editable format is acceptable even if Word exceeds one page

## Download behavior

- [ ] PDF opens in new browser tab
- [ ] DOCX triggers file download (anchor), not new tab

## One-page

- [ ] If layout exceeds one page, warning shown before PDF export
- [ ] Overflow still allows export with warning

## Automated

- [ ] `npm run test:resume-export-strategy` passes
- [ ] `npm run test` / `lint` / `build` pass
