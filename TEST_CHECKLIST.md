# Test Checklist — v0.6.8 Export Delivery & Filename Stabilization

## Desktop — PDF export (single action)

1. Open **Resume Preview** for an approved draft
2. Click **Download PDF** once
3. Confirm:
   - [ ] **One** file save dialog or Downloads entry (not tab + download + Adobe from one click)
   - [ ] Saved file uses generated name: `<Name> - Resume_<Company>_<Role>.pdf`
   - [ ] No generic `resume.pdf` from app delivery path
4. Optional: check DevTools Network — **one** POST to `/api/export/resume-pdf`, **one** GET to signed URL (or raw bytes only)

## Desktop — DOCX export

- [ ] Click **Download DOCX** once → single download
- [ ] Filename: `<Name> - Resume_<Company>_<Role>.docx`
- [ ] No duplicate Word open + download from one click (OS may still open after download)

## Mobile (regression)

- [ ] PDF/DOCX export still works; mobile hint may appear
- [ ] PDF Preview overflow badge still works

## Preview (regression)

- [ ] PDF Preview overflow detection unchanged from v0.6.7

## Automated

- [ ] `npm run test:resume-export-delivery` passes
- [ ] `npm run test:resume-export-strategy` passes
- [ ] `npm run test` / `lint` / `build` pass
