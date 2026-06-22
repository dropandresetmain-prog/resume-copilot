# Test Checklist — v0.7.2 Generate Flow UX

## Generate page flow

- [ ] Paste JD in textarea — no separate **Save job** button on Generate
- [ ] Base resume dropdown lists uploaded resumes
- [ ] Default base resume = last used (after first generate) or most recent upload
- [ ] Click **Generate Tailored Resume**
  - [ ] Progress panel shows staged messages + bar
  - [ ] Job appears in Saved Jobs list (new or reused duplicate)
  - [ ] Navigates to resume preview on success
- [ ] On failure: clear error + **Retry Generate Tailored Resume**
- [ ] Cannot double-click generate while loading

## Records regression

- [ ] Saved jobs list still visible on Generate and Records
- [ ] Edit saved job on Records → **Update saved job** still works
- [ ] Draft history on Records unchanged

## Download buttons

- [ ] Disabled PDF/DOCX buttons look disabled without ugly not-allowed cursor on hover

## Automated

- [ ] `npm run test:generate-flow` passes
- [ ] `npm run test` / `lint` / `build` pass
