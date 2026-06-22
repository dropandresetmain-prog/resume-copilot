# Test Checklist — v0.9.4 Auto Company Context + Gemini Resilience

## One-click combined flow

- [ ] Generate Resume & Cover Letter with no saved context → company context auto-generated and saved
- [ ] Second generate for same application → reuses saved context (no duplicate context call)
- [ ] Resume only mode → does not auto-generate company context

## Failure handling

- [ ] Simulate company context 503 → resume still generates; warning shown
- [ ] Cover letter uses JD fallback when context failed
- [ ] Retry Cover Letter after partial failure → does not regenerate resume or company context

## Advanced UI

- [ ] Company context not in primary card — only in Advanced
- [ ] Status: Saved / Will auto-generate / Not available
- [ ] Preview/Edit and Regenerate work manually

## Gemini retry

- [ ] Transient 503 on resume/cover letter retries before failing (check logs)
- [ ] Validation errors fail without endless retry

## Regression

- [ ] v0.9.1 partial failure recovery
- [ ] v0.9.2 cover letter quality controls
- [ ] `npm run test` passes
