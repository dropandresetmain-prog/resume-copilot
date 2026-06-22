# Test Checklist — v0.9.8 Application Package UX

## Layout

- [ ] Application package summary shows company, role, resume/cover letter/research status
- [ ] Resume PDF preview + layout sliders at top
- [ ] **Approve for Export** immediately below layout sliders (not at page bottom)
- [ ] PDF/DOCX download next to approve when approved

## Cover letter

- [ ] Cover letter body visible inline (no click to open)
- [ ] **Edit cover letter** opens dedicated editor page
- [ ] Download PDF / DOCX work from package page

## Secondary sections

- [ ] Company research collapsed by default; expands on click
- [ ] **Edit resume content** button reveals evidence/regenerate panel
- [ ] **Advanced options** collapsed; contains assessment, browser layout, HTML, JSON

## Regression

- [ ] Generation logic unchanged
- [ ] `npm run test`, `npm run lint`, `npm run build` pass
