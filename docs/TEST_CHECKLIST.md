# Test Checklist — v0.9.17B

Run `npm run test`, `npm run lint`, and `npm run build` before manual QA.

Older milestone checklists were removed during repo cleanup. Completed phase docs live under [`docs/archive/`](archive/). Live Gemini tailoring comparison: [`docs/archive/PHASE0_MANUAL_QA.md`](archive/PHASE0_MANUAL_QA.md).

---

## Automated gate

- [ ] `npm run test` — 50 verification suites pass
- [ ] `npm run lint` — no errors
- [ ] `npm run build` — succeeds

---

## Evidence spine + cover letter story (M1)

- [ ] Combined generate uses inventory-ranked evidence (not resume-draft-only) for cover letter
- [ ] Cover letter cites company-specific facts from research when website provided
- [ ] Resume draft `selectionAudit` includes spine snapshot when present
- [ ] Add Evidence panel can queue inventory bullets beyond work experience

---

## Application package

- [ ] Post-generate lands on `/resume-preview/{id}`
- [ ] Review-first layout: fit summary and review rail before prominent preview
- [ ] Approve → export sequence in review center (no duplicate approve on resume card)
- [ ] Cover letter inline on package; staged revision saves on Accept only
- [ ] Archive application hides from list; linked drafts remain reachable

---

## Generate + research

- [ ] Generate readiness strip reflects missing uploads/JD/base resume
- [ ] Confidential posting skips website research
- [ ] Website discovery requires user confirmation at medium confidence
- [ ] Progress panel shows combined research + generation stages

---

## Export

- [ ] Server PDF page count matches export gate (one-page A4)
- [ ] Re-approve required after layout slider change post-approval
- [ ] Cover letter export blocked above 420 words

---

## Inventory

- [ ] Unsaved inventory edits warn on navigation
- [ ] Project cleanup panel moves misclassified projects out of work experience
- [ ] Draft edit paths do not auto-save inventory
