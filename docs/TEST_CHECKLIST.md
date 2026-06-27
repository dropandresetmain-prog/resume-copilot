# Test Checklist — v0.9.19B

Run `npm run test`, `npm run lint`, and `npm run build` before manual QA.

Older milestone checklists were removed during repo cleanup. Completed phase docs live under [`docs/archive/`](archive/). Live Gemini tailoring comparison: [`docs/archive/PHASE0_MANUAL_QA.md`](archive/PHASE0_MANUAL_QA.md).

---

## Automated gate

- [ ] `npm run test` — verification suites pass
- [ ] `npm run lint` — no errors
- [ ] `npm run build` — succeeds

---

## Evidence controls + tailoring (live QA — v0.9.18 / v0.9.19)

- [ ] **Additional Experience on full regenerate** — stage include on full regeneration in Fix resume evidence → Apply saves controls → Regenerate full resume adds item (not targeted rewrite)
- [ ] **Cover-letter Use/Avoid staging** — Edit cover letter → stage proof evidence → Regenerate cover letter applies choices (1 AI step); staging does not save until regenerate
- [ ] **Resume vs cover letter separation** — resume evidence changes do not alter cover letter body until cover-letter regenerate; cover-letter staging does not change resume draft
- [ ] **Evidence tailoring panel** — selected / omitted / cover-letter proof sections render; omitted copy is advisory
- [ ] **Tailoring next actions** — Fix resume evidence opens package fix mode; Edit cover letter evidence opens editor; Accept risk scrolls to Approve
- [ ] **Legacy draft fallback** — older draft without `evidenceSpine` shows thinner diagnostics + legacy empty-state copy (no crash)
- [ ] **Export after evidence changes** — re-approve if layout unchanged but content regenerated; export resume PDF + cover letter after intentional accept-risk path

---

## Evidence spine + cover letter story (M1 / M2)

- [ ] Combined generate uses inventory-ranked evidence (not resume-draft-only) for cover letter
- [ ] Cover letter cites company-specific facts from research when website provided
- [ ] Resume draft `selectionAudit` includes spine snapshot when present
- [ ] Add Evidence ranked list includes Work + Additional categories; Additional is full-regenerate-only

---

## Canonical Generate → Output

- [ ] Combined generation lands on `/output/{resumeDraftId}`
- [ ] Resume-only generation lands on `/output/{resumeDraftId}`
- [ ] Resume success + cover-letter failure preserves the resume and offers cover-letter-only retry
- [ ] Direct `/output/{resumeDraftId}` reload loads persisted resume, application, and cover-letter state
- [ ] Missing cover letter is shown honestly; a failed lookup is not treated as confirmed absence

---

## Applications restoration

- [ ] Signed-out, loading, empty, and failed-load states are visibly distinct
- [ ] Direct `/records` reload shows persisted applications and linked saved jobs
- [ ] Resume/package action opens `/output/{resumeDraftId}`
- [ ] Missing resume, cover letter, or company context is shown as missing
- [ ] Status change persists and shows success or failure feedback
- [ ] Notes save persists and shows success or failure feedback
- [ ] Archive confirmation hides the application without deleting linked drafts or company context
- [ ] Generating again for an archived job creates/reuses only a non-archived application record

---

## Legacy application package

- [ ] `/resume-preview/{id}` remains reachable for legacy drafts
- [ ] Evidence tailoring panel below AI fit summary
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
