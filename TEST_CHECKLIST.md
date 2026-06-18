# Test Checklist — v0.5.5 Header and Education Rendering Fixes

## Header sizing

- [ ] Candidate name renders at section-header size (body + 0.5px), not body size
- [ ] Name size matches Work Experience / Education section title size
- [ ] Header stays compact and respects reference alignment (center/left)

## Education rendering (NTU-style double degree)

- [ ] Line 1: institution + special programme bold left, location right
- [ ] Line 2+: each degree italic left; date range only on first degree when shared
- [ ] No duplicate institution text (e.g. no `NTU, NTU` or repeated full university name)
- [ ] Degree names are not bolded

## Regression

- [ ] Work experience layout unchanged
- [ ] One-page auto-optimization still runs on preview load
- [ ] Draft edit/delete still does not mutate inventory

## Automated

- [ ] `npm run test` passes (includes layout + education normalization checks)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
