# HANDOFF

## Current milestone

**v0.6.1 — DOCX Export Fidelity Fixes**

DOCX export now uses Gill Sans MT, explicit 10pt+ font mapping, borderless tables for alignment, company-descriptor styling, corrected filenames, and no Professional Summary in resume output.

## Product flow

```
Paste JD → Generate Resume → One-page preview → Approve for Export → Download DOCX
```

PDF export (v0.6.2+) waits on manual DOCX recheck. Cover letters deferred.

## v0.6.1 highlights

**Filename:** `<FULL NAME> - Resume_<COMPANY>_<ROLE>.docx`

**Fonts:** Gill Sans MT preferred; every DOCX text run sets font explicitly (no Times New Roman leakage)

**Font sizes:** Preview 11px → DOCX 10pt body; headers +0.5pt max

**Layout:** Borderless two-column tables for work/education left/right rows; company bold, descriptor normal

**Professional Summary:** Not part of resume — schema field stays empty; cover letter future use only

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.0 — DOCX export | Complete |
| **v0.6.1 — DOCX fidelity fixes** | **Current** |
| v0.6.2 — PDF export (after DOCX recheck) | Next |
| v0.7.0 — Cover letter generation | Later |

## Run

```bash
npm run dev
npm run test
```
