# Test Checklist — v0.9.0 Cover Letter MVP

## Profile

- [ ] `/profile` loads for signed-in user
- [ ] Paste profile content → Save → refresh → content persists
- [ ] Empty profile still allows generation (with risk flag)

## Generate

- [ ] Mode: Resume + Cover Letter generates both artifacts
- [ ] Mode: Resume only skips cover letter
- [ ] Advanced: company name, country, website, additional instructions passed through
- [ ] Combined flow lands on cover letter preview with resume link

## Cover letter preview

- [ ] Formal letter editable and saveable
- [ ] Download PDF (one page)
- [ ] Download DOCX
- [ ] Secondary formats visible with Copy buttons

## Records / Resume preview

- [ ] Application card links to formal cover letter
- [ ] Resume preview → Generate formal cover letter if missing

## Regression

- [ ] Resume generate / approve / export unchanged
- [ ] Application shell (v0.8.0)
- [ ] `npm run test` passes

## Parked

- [ ] Live web company research
- [ ] Secondary format export
