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

## Client-side only

No server database. Use export/import JSON to move inventory between browsers.

## Mammoth limitations

Plain-text DOCX extraction may affect section and line structure.
