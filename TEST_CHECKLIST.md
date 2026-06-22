# Test Checklist — v0.9.7 Cover Letter & Application Package

## Company name in prose

- [ ] Cover letter uses `ShelfPerfect` (or resolved brand), not `https://shelfperfect.com/`
- [ ] JD line `Company: https://...` does not become company name in generation
- [ ] Validation rejects URLs in cover letter body

## Company research visibility

- [ ] After combined generate, land on `/resume-preview/{id}` (application package)
- [ ] Company research panel visible and expanded on resume preview
- [ ] Cover letter panel links to full editor
- [ ] Cover letter preview has "Back to application package" link

## Cover letter quality

- [ ] Letter references ≥2 company-specific facts from saved research
- [ ] Letter references ≥2 role requirements from JD
- [ ] Rationale includes ≥2 explicit company→role→story bridges
- [ ] B2B sales role ranks SBF/commercial evidence above founder stories

## Export naming

- [ ] Cover letter PDF: `Hset Min Htet - Cover Letter_ShelfPerfect_B2B Sales Manager.pdf`
- [ ] Cover letter DOCX: same stem with `.docx`
- [ ] Resume PDF: `Hset Min Htet - Resume_ShelfPerfect_B2B Sales Manager.pdf`

## Regression

- [ ] Auto company research (v0.9.6) still works
- [ ] `npm run test`, `npm run lint`, `npm run build` pass
