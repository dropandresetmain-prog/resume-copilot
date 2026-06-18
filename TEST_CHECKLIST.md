# Test Checklist — v0.5.4 Draft Records + One-Page Optimization

## Records / Generated Drafts

- [ ] Section title reads **Generated Drafts**
- [ ] **Edit** opens `/resume-preview/[draftId]`
- [ ] **Delete** confirms, removes draft from Supabase and UI
- [ ] Delete failure shows visible error
- [ ] Draft row shows Company — Role, timestamp, status, provider

## One-page optimization

- [ ] First preview load uses auto-optimized settings (starts 11px)
- [ ] Preview fits one page for typical mock draft without manual sliders
- [ ] Overflow warning + layout fit panel when still over one page

## Keyword bullets

- [ ] No generic `Experience:` keyword in work bullets when specific keyword available

## Skills section

- [ ] **Tech:** line for programming/tools
- [ ] **Skills:** line for business skills
- [ ] **Languages:** and **Interests:** lines present when data exists

## Assessment

- [ ] Resume–Job Fit and Layout Fit shown separately
- [ ] Preview fit uses `preview-fit-heuristic-v1` (provisional — see `docs/FIT_SCORE_RUBRIC.md`)

## Draft edit safety (inventory non-mutation)

- [ ] Edit resume details / mark reviewed saves only to `generated_resume_drafts`
- [ ] Approve for Export does not change career inventory or enrichment
- [ ] Delete generated draft does not remove or alter uploaded resumes
- [ ] `npm run test:draft-inventory-safety` passes

## Capitalization

- [ ] **Saved Jobs**, **Generated Drafts** section titles use title case
