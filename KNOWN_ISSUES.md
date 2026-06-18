# Known Issues

## Collated inventory is derived

Collated inventory is rebuilt from parsed resumes whenever the setup page loads or resumes change. It is not stored separately in export JSON.

## Atomic splitting heuristics

Additional experience and skills are split using delimiter heuristics (comma, semicolon, parenthesis-aware). Complex lines may remain unsplit or split imperfectly. Raw text variants are preserved on collated items.

## Parser architecture

Parsing is layered:

1. **Section detection** — common header aliases; unknown headers preserved as unparsed
2. **Generic extraction** — tries to structure content with confidence scoring
3. **Format profiles** — the two-line column layout (company + role/date) is the first registered profile
4. **Fallback** — low-confidence or unknown sections appear under **Unparsed / Needs Review** with raw text preserved

## Education structure

Education is preserved as institution → programme(s) → date range → bullets. Achievements, honours, scholarships, and grades are not classified during parsing; AI interpretation is intentionally deferred.

## Work experience collation

Experiences merge on normalized company + role. Near-identical bullets within the same experience are deduplicated; meaningfully different wording is kept as separate bullets.

## Client-side parsing; Supabase for persistence

Resume parsing runs in the browser. Parsed inventory, job descriptions, and uploaded files sync through **Supabase** when signed in. Sign in is required for save/sync when Supabase is configured.

Older versions stored data in `localStorage` only. The app shows a one-time warning if legacy keys are detected; there is no automatic migration.

## AI enrichment

- Suggestions are reviewable metadata stored in `inventory.enrichment`, separate from parsed resumes.
- Each suggestion is a review card: issue title, before text, optional suggested after, changes, rationale, and risk warnings.
- **Mock provider is test-only** (rule-based local output). It is not real AI analysis. A banner in the enrichment panel labels mock mode clearly.
- **Cursor does not perform enrichment.** Real enrichment requires `AI_PROVIDER=gemini` or `openai` plus the matching API key on the app server.
- Gemini requires `GEMINI_API_KEY` and `AI_PROVIDER=gemini`.
- Enrichment uses stable `bulletKey` values because collated bullet IDs change when inventory is rebuilt.
- Accepted keyword suggestions add to the keyword bank; rejected/ignored suggestions remain visible in review history.
- Legacy enrichment exports without review-card fields are migrated on load and do not crash the UI.

## Mammoth limitations

Plain-text DOCX extraction may affect section and line structure.
