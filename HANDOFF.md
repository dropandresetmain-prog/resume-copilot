# HANDOFF

## Current milestone

**v0.9.7 — Cover Letter Relevance, Company Research Visibility & Application Flow**

Cover letters must use company display names (never URLs), explicit company→role→story bridges, relevance-ranked evidence, and structured rationale validation. Combined generation lands on the **Application package** (resume preview) with cover letter + company research visible.

## v0.9.6 highlights

Automatic website research during combined generation; dynamic progress stages; manual research demoted to Advanced.

## Product flow

```
Generate Resume & Cover Letter
  → Application package (/resume-preview/{resumeDraftId})
      ├ Resume (primary)
      ├ Cover letter (panel link)
      └ Company research (expanded panel)
```

## Cover letter architecture (v0.9.7)

1. Select company facts (≥2) → rationale `selectedCompanyFacts`
2. Select role requirements (≥2) → `selectedRoleRequirements`
3. Rank resume stories by JD relevance (not chronology)
4. Build explicit bridges (≥2) → `companyRoleStoryBridges`
5. Draft letter: each story block = company fact → role need → evidence → why relevant

## Company name rules

- Prose uses `displayName` / resolved brand name only
- URLs never appear in cover letter body (validated)
- `resolveCompanyDisplayNameForProse()` prefers saved research display name, then clean name, then website hostname brand

## Export naming

- Resume: `{Full Name} - Resume_{Company}_{Role}.pdf`
- Cover letter: `{Full Name} - Cover Letter_{Company}_{Role}.pdf`

## Run

```bash
npm run dev
npm run test
npm run lint
npm run build
```
