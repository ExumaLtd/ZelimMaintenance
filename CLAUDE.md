# CLAUDE.md

Standing conventions for the Zelim maintenance portal. Follow these in every session.

## Writing style

- Never use em dashes or en dashes in code comments, commit messages, or documentation.
- The dash rule does not apply to user-facing UI copy, where normal typographic punctuation, including en dashes, is fine.
- Plain, direct prose.

## Product naming

- The product is the Swift Rescue Conveyor. In human-readable text it is "Swift", not "SWIFT".
- Identifiers keep their existing casing and must not be renamed: `AIRTABLE_SWIFT_TABLE`, the `/swift/[id]` routes, `swift-resolve-pin`, the `swift_units` Airtable table, the `zelimmaintenance/SWIFT/` Cloudinary folder, CSS class names, and the PDF paths in `public/downloads`.

## Code and commits

- One logical change per commit, conventional-style message (`security:`, `chore:`, `docs:`, `fix:`).
- Prefer complete files over partial snippets when presenting changes.
- TypeScript strict mode is off. Do not enable it without being asked.
- Do not refactor the large form components (annual, depth, monthly, unscheduled, fault-reporting) for style or lint reasons. They are safety-critical. Behaviour changes there need explicit instruction.
- The 59 react-hooks v6 lint warnings are accepted tech debt, deliberately set to warn. Do not silence them or refactor to clear them.

## Security conventions

- All Airtable access is server-side. No credential may reach the client.
- Any route accepting a record ID from the request must verify ownership against the session before reading or writing.
- User input used in an Airtable `filterByFormula` must go through the `esc()` helper.
- Required environment variables are asserted at module load via `requireEnv` in `lib/env.ts`. New required vars follow the same pattern.
- Rate limiting: fail loud on missing configuration, fail open on runtime outage. Do not change without discussion.
- `ELEVENLABS_API_KEY` is deliberately guarded in-handler, not at module load, so voice input degrades gracefully to manual text entry. Do not promote it to a module-load guard.

## Operational notes

- `AIRTABLE_PAT` names two independent credentials: the Vercel runtime token and the GitHub Actions backup secret. Different scopes, must not be interchanged.
- Upstash free-tier databases can be deleted for inactivity. If rate limiting silently stops working, check the database still exists.
- The portal has live users on vessels. Test on a Vercel preview before merging to main.
- Never push, merge, or open a pull request without being asked explicitly.
- Never print or echo secret values, including in error messages or logs.
