# Test Checklist — v0.9.2 Cover Letter Quality

## Profile

- [ ] `/profile` loads for signed-in user
- [ ] Paste profile content → Save → refresh → content persists
- [ ] Empty profile still allows generation (with risk flag)

## Generate

- [ ] Mode: Resume + Cover Letter generates both artifacts
- [ ] Mode: Resume only skips cover letter
- [ ] Cover letter failure shows resume success + Retry Cover Letter (v0.9.1)
- [ ] Advanced: company name, country, website, additional instructions passed through
- [ ] Combined flow lands on cover letter preview with resume link
- [ ] Company name like `FAR EAST FACADE (SINGAPORE)` appears as `Far East Facade` in letter prose

## Cover letter preview

- [ ] Formal letter editable and saveable
- [ ] Word count shown; warning when >420 words
- [ ] Export disabled when >420 words or banned phrases
- [ ] **Shorten to 420 words** quick action works
- [ ] Other quick actions (warmer, conversational, remove AI phrases, etc.)
- [ ] Custom revision instruction works
- [ ] Download PDF (one page, ≤420 words)
- [ ] Download DOCX
- [ ] Secondary formats visible with Copy buttons
- [ ] Revision does not regenerate resume

## Records / Resume preview

- [ ] Application card links to formal cover letter
- [ ] Resume preview → Generate / Retry cover letter if missing/failed

## Regression

- [ ] Resume generate / approve / export unchanged
- [ ] Application shell (v0.8.0)
- [ ] `npm run test` passes

## Parked

- [ ] Live web company research
- [ ] Secondary format export
