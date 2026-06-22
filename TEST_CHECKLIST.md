# Test Checklist — v0.7.3 Generate Box UX

## Single-card generate flow

- [ ] `/generate` shows **one** primary card (not a separate box below for the CTA)
- [ ] Inside the card: paste JD → base resume dropdown → **Generate Tailored Resume**
- [ ] Progress panel appears in the same card after clicking Generate
- [ ] Saved jobs list appears below a visual divider in the same card
- [ ] No separate Save Job button on Generate
- [ ] Pasting/editing JD does **not** create saved job rows until Generate is clicked

## Regression

- [ ] Records page edit/save still works
- [ ] Duplicate generate clicks blocked during loading
- [ ] `npm run test:generate-flow` passes
