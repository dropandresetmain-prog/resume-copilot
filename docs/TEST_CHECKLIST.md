# Current manual test checklist

Run the automated gate first:

```bash
npm run test
npm run lint
npm run build
```

## Canonical authenticated journey

- [ ] Sign up or sign in; auth redirects settle on the intended Folio route.
- [ ] Onboarding accepts a `.docx` resume and persists the parsed inventory.
- [ ] Career Vault shows the uploaded evidence and allows safe overlay edits.
- [ ] Generate accepts Company, Target role, and a job description.
- [ ] Company discovery is visible and confidence-checked; confidential/recruitment mode stays JD-only.
- [ ] Resume-only generation performs one logical AI step.
- [ ] Resume + cover-letter generation reports the expected logical steps and lands on `/output/[draftId]`.
- [ ] Partial cover-letter failure preserves the generated resume and offers an honest recovery path.
- [ ] Applications links the job to the same `/output/[draftId]` draft.

## Output Editor

- [ ] Resume and cover-letter tabs load the linked persisted drafts.
- [ ] Text/PDF view switching preserves in-session staged changes.
- [ ] Selecting N resume bullets for replacement returns exactly N replacements.
- [ ] Staged resume changes affect only the selected targets.
- [ ] Resume and cover-letter staging remain separate.
- [ ] Content edits re-lock content confirmation and invalidate prior approval.
- [ ] Layout controls unlock only after content confirmation.
- [ ] PDF preview updates when layout controls change.
- [ ] Approve uses server validation and visibly reports one-page failures.
- [ ] PDF export remains blocked until server validation passes.
- [ ] PDF and DOCX downloads use the expected filenames.
- [ ] Cover-letter export enforces its word-limit gate.

## Career Vault and Applications

- [ ] Work, Skills, Education, and Additional tabs render persisted inventory.
- [ ] Edit/hide/revert saves through the overlay without mutating source resume parses.
- [ ] Add-from-text routes personal projects to Additional Experience.
- [ ] Project cleanup decisions persist and explain that existing drafts require regeneration.
- [ ] Application counts are plausible for the source resumes used by generated drafts.
- [ ] Application status and notes persist after reload.
- [ ] Archived applications leave linked drafts intact and disappear from the default list.

## Route and shell regression

- [ ] `/dashboard`, `/inventory`, `/generate`, `/records`, and `/output/[draftId]` mount their Folio page clients.
- [ ] `/resume-preview/[draftId]`, its edit route, and `/cover-letter-preview/[draftId]` return 404.
- [ ] `/dev-tools` returns 404 in production.
- [ ] Desktop and mobile layouts have no horizontal overflow or clipped primary actions.
- [ ] New UI uses Folio tokens and preserves readable focus, loading, error, and disabled states.

Record failures with route, account state, input, expected result, actual result, and whether persistence or a billable AI call occurred.
