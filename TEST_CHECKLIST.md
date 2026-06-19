# Test Checklist — v0.6.7 PDF Preview Truth Patch

## Desktop — PDF Preview overflow truth

1. Open **Resume Preview** (`/resume-preview/[draftId]`)
2. Confirm PDF Preview is primary; adjust layout sliders — PDF Preview updates immediately
3. With content near one page, confirm preview shows full content (no silent bottom clip)
4. Increase font/spacing until content exceeds one A4 page:
   - [ ] Amber badge: “PDF preview content extends beyond one page”
   - [ ] Dashed line at page 1 boundary
   - [ ] Scroll reveals content below page 1 (iframe expanded)
5. **Approve for Export** — downloads enabled
6. Download PDF — note server may still differ slightly from browser preview (fonts)

## Approval + formatting (regression)

- [ ] Approve → change slider → PDF/DOCX download disabled
- [ ] Re-approve → download uses new settings
- [ ] Records export blocked when status is `layout_changed`

## Mobile (regression)

- [ ] PDF Preview A4 scale-to-fit still works on narrow viewport
- [ ] Overflow badge visible when content exceeds one page
- [ ] Mobile PDF/DOCX export navigation still works

## Copy

- [ ] Footer copy says “closest visual preview” / server may differ — not “exact” parity

## Automated

- [ ] `npm run test:resume-pdf-preview-overflow` passes
- [ ] `npm run test:resume-export-strategy` passes
- [ ] `npm run test` / `lint` / `build` pass
