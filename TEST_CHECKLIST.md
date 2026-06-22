# Test Checklist — v0.7.7 Inventory Editing & Regeneration

## Automated (`npm run test`)

- [ ] `test:inventory-edits` — hidden/edited overlay, payload exclusion, stable bulletKey, forced selection
- [ ] `test:generation-payload` — accepted wording, advisory keywords, hidden bullet exclusion
- [ ] `test:draft-inventory-safety` — draft/regeneration paths do not save inventory
- [ ] Full `npm run test` suite passes

## Inventory editing

- [ ] Inventory → **Edit Bullets** tab lists work experience by company/role
- [ ] Exclude bullet → labeled “Excluded from generation”; collated view hides it
- [ ] Restore excluded bullet
- [ ] Edit bullet wording → active text changes; original shown; source resumes unchanged (Source tab)
- [ ] Save inventory edits → persists after refresh (signed in)
- [ ] Enrichment review shows: “Accepted wording is used as preferred phrasing during resume generation.”

## Regeneration

- [ ] Generate resume → preview shows **Evidence & regeneration** panel
- [ ] Generated bullets show source references when available
- [ ] Uncheck generated bullet → excluded from next regeneration payload
- [ ] Force inventory bullet → included in next regeneration
- [ ] Regenerate updates same draft (not a new row every toggle)
- [ ] Layout edits still update same draft row
- [ ] Too many forced bullets shows warning / graceful failure

## Unchanged

- [ ] Skills & Interests cleanup (v0.7.5)
- [ ] Additional experience normalization (v0.7.4)
- [ ] One-page server PDF validation on Approve
- [ ] No cover letters / opportunity intelligence
