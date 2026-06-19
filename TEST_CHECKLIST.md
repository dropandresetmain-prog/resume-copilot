# Test Checklist — v0.6.6 Resume Generation Rules & Approval Formatting Fixes

## Desktop — PDF Preview truth

1. Open **Resume Preview** (`/resume-preview/[draftId]`)
2. Confirm PDF Preview is primary; adjust layout sliders — PDF Preview updates immediately
3. **Approve for Export** — downloads enabled
4. Change any layout slider — banner shows layout changed; downloads **disabled**
5. **Re-approve for Export** — downloads enabled with **new** settings
6. Download PDF — confirm matches PDF Preview at re-approved settings

## Approval + formatting

- [ ] Approve → change slider → PDF/DOCX download disabled (not stale silent export)
- [ ] Approve → change slider → Re-approve → download uses new settings
- [ ] Approve button shows “Re-approve for Export” after layout change
- [ ] Records export blocked when status is `layout_changed`

## Font ceiling

- [ ] Body font slider reaches **20px**
- [ ] Export/PDF Preview reflect larger font when approved

## DOCX warning

- [ ] Warning visible near DOCX download about Word reflow / one page

## Generation rules (manual / mock)

- [ ] New drafts follow Work Experience bullet-count guidance (max 4 roles, 2–4 bullets each)

## Mobile (regression)

- [ ] PDF Preview A4 scale-to-fit still works
- [ ] Mobile PDF/DOCX export navigation still works

## Automated

- [ ] `npm run test:resume-approval-layout` passes
- [ ] `npm run test:resume-draft` passes (prompt rules)
- [ ] `npm run test` / `lint` / `build` pass
