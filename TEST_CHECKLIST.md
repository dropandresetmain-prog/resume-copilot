# Test Checklist — v0.7.0 One-Page Export Validation

## Approve — server validation

1. Open **Resume Preview** for a draft tuned near one page
2. Click **Approve for Export**
   - [ ] Button shows **Validating server PDF…**
   - [ ] On success: Server PDF panel shows **1 page** + timestamp
   - [ ] PDF/DOCX downloads enabled
3. Increase font/spacing until server PDF exceeds one page
   - [ ] Approve returns error with **page count** + remediation bullets
   - [ ] Draft stays unapproved / not export-ready
   - [ ] PDF download disabled

## Export hard gate

- [ ] Approved one-page draft downloads PDF successfully
- [ ] If server PDF would exceed one page, `/api/export/resume-pdf` returns **422** (no file stored)

## UI separation

- [ ] Heuristic layout estimate labeled non-authoritative
- [ ] Server validation panel labeled export truth
- [ ] PDF Preview copy says local approximation

## Regression

- [ ] v0.6.8 blob download + filename still works
- [ ] Layout change after approval → re-approve required
- [ ] PDF Preview overflow badge still works

## Automated

- [ ] `npm run test:resume-pdf-page-count` passes
- [ ] `npm run test:resume-approve-validation` passes
- [ ] `npm run test` / `lint` / `build` pass
