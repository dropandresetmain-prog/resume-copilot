# Test Checklist — v0.9.8C (full regression)

Run `npm run test`, `npm run lint`, `npm run build` before manual QA.

---

## v0.9.11C UI QA

- [ ] Desktop screenshot QA: Uploads, Inventory, Generate, Applications, Application Package, Resume Edit, Cover Letter Preview/Edit, Profile
- [ ] Mobile screenshot QA: Uploads, Inventory, Generate, Applications, Application Package, Resume Edit, Cover Letter Preview/Edit, Profile
- [ ] Main nav is reachable and readable on mobile
- [ ] Primary action is obvious on each screen
- [ ] A4 resume and cover letter previews scale without horizontal overflow or clipped controls
- [ ] Application Package section rail does not hide review/export controls
- [ ] Saved jobs and legacy drafts remain reachable as secondary Applications/Generate details

---

## Company research

- [ ] Generate with company website in Advanced — Firecrawl research runs (or mock/JD fallback without key)
- [ ] Progress bar shows research stages when website provided
- [ ] Compact status on Generate shows website-backed vs JD-based
- [ ] Saved website-backed research reused on second generate (no redundant scrape)
- [ ] JD-only context does not block Firecrawl when website added later
- [ ] Application package: company research collapsed by default; summary visible in header
- [ ] Expanded panel shows source type, timestamp, website link, edit/save

---

## Cover letters

- [ ] Combined generate produces cover letter linked to resume draft
- [ ] Cover letter uses `ShelfPerfect` (not URL) in prose when research has displayName
- [ ] Inline cover letter readable on application package (paragraphs, scroll)
- [ ] Edit cover letter → dedicated editor; **Back to application package** works
- [ ] Quick revision actions work; 420-word cap enforced
- [ ] Export PDF/DOCX with structured filename: `Name - Cover Letter_Company_Role.pdf`
- [ ] Cover letter failure does not delete resume draft (retry only)

---

## Application package

- [ ] Post-generate lands on `/resume-preview/{id}` (not cover letter first)
- [ ] Summary shows company, role, resume/cover letter/research status chips
- [ ] Resume PDF preview + layout sliders at top
- [ ] **Approve for Export** below layout controls (not buried)
- [ ] PDF/DOCX download when approved
- [ ] Edit resume content hidden until toggled
- [ ] Advanced options collapsed (assessment, browser layout, HTML, JSON)

---

## Resume auto-repair (v0.9.8B)

- [ ] Generate when model returns 5 roles — draft saves (not blocked)
- [ ] Amber **structure repair** banner lists actions (e.g. reduced roles, trimmed bullets)
- [ ] Status chip shows **Needs structure review** when repaired
- [ ] Work Experience ≤4 roles; ≤4 bullets per role; total ≤13 where possible
- [ ] Dropped role evidence in Additional Experience when applicable
- [ ] Empty work experience still fails generation (no draft)
- [ ] Inventory unchanged after generate/repair

---

## Export & approve

- [ ] Approve runs server one-page PDF validation
- [ ] Export blocked when server PDF >1 page
- [ ] Resume filename: `Name - Resume_Company_Role.pdf`
- [ ] Re-approve required after layout slider change post-approval

---

## Records & inventory

- [ ] Application record created/linked per job on generate
- [ ] Records page shows application with normalized company name in label
- [ ] Inventory edit bullets: hide/edit does not mutate source DOCX
- [ ] Draft history shows only unlinked drafts

---

## Regression

- [ ] `npm run test` — all verification scripts pass
- [ ] `npm run lint` — no errors
- [ ] `npm run build` — succeeds
