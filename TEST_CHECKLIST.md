# Test Checklist — v0.6.0 Resume DOCX Export

## End-to-end flow

- [ ] Generate resume → preview loads with auto-optimized layout
- [ ] Click **Approve for Export**
- [ ] **Download DOCX** enabled after approval
- [ ] DOCX downloads and opens in Word / Google Docs
- [ ] Browser preview and DOCX layout match (sections, bullets, education structure)
- [ ] Filename follows `<Name> - Resume _<Company> _<Role>.docx` when JD metadata exists

## Preview page

- [ ] Download disabled with helper text before approval
- [ ] PDF button shown disabled (`PDF export coming next`)
- [ ] Export error shown visibly on failure
- [ ] Manual layout slider changes reflected in exported DOCX

## Records page

- [ ] Approved drafts show **Download DOCX**
- [ ] Non-approved drafts show disabled download with helper text
- [ ] Delete still works without affecting inventory

## Storage / auth

- [ ] Signed-in user can export own approved draft
- [ ] Export does not mutate career inventory
- [ ] DOCX appears in Supabase `generated-documents` bucket (when configured)

## Automated

- [ ] `npm run test:resume-docx-export` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
