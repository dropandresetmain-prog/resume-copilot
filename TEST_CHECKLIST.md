# Test Checklist — v0.5.2 Resume Layout Fidelity Fixes

## Post-generation flow

- [ ] Generate resume redirects to `/resume-preview/[draftId]`
- [ ] Layout preview shows A4 page container with visible border/shadow
- [ ] Dashed line marks one-page boundary
- [ ] Overflow warning suggests reducing bullets (no auto-delete)

## Work Experience layout

- [ ] Line 1: bold company (+ descriptor in parens) left, location right
- [ ] Line 2: italic role left, date range right
- [ ] Bullets show list markers
- [ ] `Keyword:` is underlined; description is normal text

## Education layout

- [ ] Line 1: bold institution · programme left, location right
- [ ] Line 2: italic degree left, date range right
- [ ] Double degrees: date range only on first degree line when shared
- [ ] Achievement bullets show markers; `Achievement:` underlined when present

## Additional Experience & Skills

- [ ] Additional Experience is compact (comma-separated)
- [ ] Languages/interests NOT in Additional Experience
- [ ] Skills & Interests section shows underlined Skills:, Languages:, Interests: lines

## Edit route

- [ ] **Edit Resume Details** navigates to `/resume-preview/[draftId]/edit`
- [ ] Edit page loads draft by id and shows review workspace
- [ ] Edits save back to draft row
- [ ] Back link returns to layout preview

## Approval

- [ ] **Approve for Export** sets status to `approved`

## Duration

- [ ] Mar 2019 – Jun 2019 shows 4 months
- [ ] Jan 2020 – Jan 2020 shows 1 month
