# Test Checklist — v0.6.5 Preview Truth & Mobile Export Stabilization

## Desktop — PDF Preview truth

1. Open **Resume Preview** (`/resume-preview/[draftId]`)
2. Confirm **PDF Preview** is the primary preview (top of page)
3. Adjust layout sliders — confirm PDF Preview updates immediately
4. **Approve for Export**
5. **Download PDF** — compare downloaded PDF to PDF Preview (layout, fonts, spacing)
6. Confirm React “approximate layout estimate” is collapsed under Advanced and not required for export decisions

## Desktop — download behavior

- [ ] PDF opens in new browser tab
- [ ] DOCX triggers file download (anchor), not new tab

## Mobile — A4 preview

- [ ] PDF Preview preserves A4 proportions (scaled sheet, not reflowed mobile layout)
- [ ] Pinch/scroll acceptable; content does not reflow to single-column mobile résumé
- [ ] Layout sliders still update PDF Preview

## Mobile — export

- [ ] PDF export opens/navigates (same-tab); file viewable or saveable via browser Share
- [ ] DOCX export navigates or opens; mobile hint shown if applicable
- [ ] No silent failure after tapping Download

## One-page (warning only — hard gate deferred)

- [ ] If layout exceeds one-page estimate, warning shown
- [ ] Overflow still allows export with warning

## Automated

- [ ] `npm run test:resume-export-strategy` passes
- [ ] `npm run test:resume-export-model-parity` passes
- [ ] `npm run test` / `lint` / `build` pass
