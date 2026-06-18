# Test Checklist — v0.6.2 Direct Resume PDF Export

## Filename

- [ ] DOCX: `<Name> - Resume_<Company>_<Role>.docx`
- [ ] PDF: `<Name> - Resume_<Company>_<Role>.pdf` (same stem)

## Preview page (`/resume-preview/[draftId]`)

- [ ] Approve → Download DOCX works
- [ ] Approve → Download PDF works
- [ ] Before approval: both disabled with helper text
- [ ] Company name bold; descriptor normal weight
- [ ] Header/section size visibly one step above body (+1px)
- [ ] No Professional Summary section
- [ ] Overflow warning on PDF export if preview exceeds one page

## Records page

- [ ] Approved drafts show Download DOCX and Download PDF

## PDF manual check

- [ ] Open PDF — Gill Sans MT or fallback sans-serif
- [ ] A4 one-page layout matches browser preview more closely than DOCX
- [ ] Work/education left/right rows aligned
- [ ] Keyword bullets underlined

## DOCX (unchanged path)

- [ ] DOCX still works; Word may differ from preview/PDF

## Automated

- [ ] `npm run test:resume-pdf-export` passes
- [ ] `npm run test:resume-docx-export` passes
- [ ] `npm run test` / `lint` / `build` pass
