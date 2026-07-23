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
- TypeScript strict mode is on and the build must stay clean under it. Prefer real types over assertions; explicit `any` is acceptable only at genuinely dynamic boundaries (draft JSON, third party callbacks).
- The five maintenance forms are safety-critical. Their shared machinery lives in `components/maintenance-form/` (admin card, question field, declaration card, persistence, submit plumbing, single- and multi-step engines); annual, unscheduled and fault-reporting are thin config wrappers, while monthly and depth keep their unique checklist logic in the page. Behaviour changes need explicit instruction, and the persistence strings in the configs (draft slugs, upload slugs, Airtable type labels) must never change since live drafts depend on them.
- Lint runs at zero warnings and CI enforces it. Every eslint-disable in the codebase carries a one-line reason (mount-only effects, SSR-safe state init, blob-URL thumbnails); do not add a disable without one.

## Tests and CI

- `npm test` runs the vitest suite in `tests/`. The payload and form-config tests encode live contracts (Airtable payload shape, draft and upload slugs, type labels). A failure there means a breaking change for live drafts or the API; do not update the assertion without a migration plan.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and a production build on pushes to main and pull requests.

## Styling

- New and migrated UI uses Tailwind v4. Design tokens (brand colors, fonts) live in `styles/tailwind.css` and are the single source of truth; do not hardcode brand hex values in components.
- Fonts are declared in `@theme inline` because next/font sets its variables on a wrapper div, not `:root`. Keep them there.
- Tailwind preflight and cascade layers are deliberately not imported: the remaining plain CSS is unlayered, and unlayered rules always beat layered ones, which would disable every utility. globals.css provides the base reset instead.
- Shared UI primitives live in `components/ui/` (PortalShell, MessageCard, ArrowButton). Reuse them instead of re-styling cards and buttons per page. All arrow buttons across the portal are ArrowButton or its exported classes.
- Three plain CSS files remain by design, all referencing the theme tokens: `globals.css` (site-wide base), `scanner.css` (DOM injected by html5-qrcode inside `#reader`), and `form.css` (react-day-picker theming, pseudo-element mobile labels on the equipment tables, autofill and appearance hacks, and the has-error state styling). Do not try to convert these to utilities; they cover things utilities cannot reach.

## Held major upgrades

Two major upgrades are held pending upstream support. Both unblock when `eslint-config-next` updates its bundled lint stack. Recheck when Next ships a major.

- TypeScript 7: held. Blocked because the `typescript-eslint` peers cap at `typescript <6.1.0`, including its latest release, so lint and the Next build fail. The codebase itself compiles clean under TypeScript 7 with zero errors, so this is an upstream wait, not a code problem.
- ESLint 10: held. Blocked because `eslint-plugin-react` 7.37.5 (its latest release) still calls `context.getFilename()`, which ESLint 10 removed, and its peers cap at ESLint 9.7, so lint crashes on load. `eslint-config-next`'s own peer of `eslint >=9.0.0` is misleadingly permissive since the plugins it bundles are not.

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
