# HANDOFF

## Current milestone

**v0.9.8B — Resume Generation Auto-Repair & Non-Blocking Validation**

Gemini structure violations (too many roles/bullets) are auto-repaired before save. Repaired drafts get `needs_review` status, visible repair banner on application package, and `resume_structure_needs_review` risk flag. Hard-block only on missing work experience, unparseable JSON, missing skills groups, or unnormalizable additional experience.

## v0.9.8A highlights

Company name display consistency, export naming, cover letter inline readability, company research discoverability.

## v0.9.8 highlights

Application package page reorganized: resume approve/export next to layout controls, inline cover letter preview, collapsed company research and advanced/debug sections, edit resume content behind a toggle.

## Application package page order

1. Summary (company, role, status chips)
2. Resume — preview, layout sliders, **Approve for Export**, downloads
3. Cover letter — **inline body**, Edit / PDF / DOCX
4. Company research — collapsed by default
5. Edit resume content — hidden until toggled (evidence + regenerate)
6. Advanced options — assessment, browser layout, HTML debug, JSON

## Run

```bash
npm run dev
npm run test
npm run lint
npm run build
```
