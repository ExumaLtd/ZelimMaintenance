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
- `ELEVENLABS_API_KEY` is deliberately guarded in-handler, not at module load, so voice input degrades gracefully to manual text entry. Do not promote it to a module-load guard. `W3W_API_KEY` follows the same pattern in reverse-geocode: optional, and submissions simply omit what3words when unset.
- submit-maintenance payloads are shape-validated by the loose zod schema in `lib/submit-schema.ts`. It is a gate, not a transformer: the handler still reads `req.body`. All five form payload variants are contract-tested in `tests/submit-schema.test.ts`; never tighten a field without those tests proving the live forms still pass.

## Offline submissions

- `utils/offline-queue.ts` queues a submission in localStorage when the device is offline or the submit fetch dies at the network level, and flushes oldest-first on app load and on the browser online event (wired in `_app`). All three submit paths (form engine, monthly, depth) go through `submitOrQueue`.
- Queueing is an accepted outcome, not an error: the form clears its local state and navigates to the completion page with queued messaging, entries carry unique ids so distinct submissions never overwrite each other, and a failed queue write throws `OfflineSaveError` so the UI never claims unsaved work is safe. Do not reintroduce a keep-the-form-open queued path; it created duplicate-record races.
- The flusher classifies failures: network errors and non-JSON 200s retry later, 401 stops the flush until the next login, 403 skips the entry (wrong unit for this session) so it cannot block others, and 400-class rejections park the entry as failed. The dashboard's `OfflineQueueBanner` surfaces pending and failed counts; keep it mounted or the queue is invisible.
- Report email bodies are built before submitting; only recordRef comes from the submit response and is patched in at send time. Keep it that way or offline queueing breaks.
- The flusher dequeues an entry before sending its report email so a mid-flush failure can never submit the same record twice. A failed report email after a successful save is deliberately swallowed: surfacing it makes users resubmit and duplicate records.
- Draft mirrors (`useLocalDraftMirror` and the page-local copies in monthly and depth) hold their writes until the draft loader's ready ref flips, or the initial empty state destroys the saved mirror before the localStorage fallback can read it.

## Tests and CI

- `npm test` runs the vitest suite in `tests/`: persistence-string tripwires, exact payload shape, the submit schema contract, security helpers, and the offline queue. These encode live contracts (Airtable payload shape, draft and upload slugs, type labels); a failure means a breaking change for live drafts or the API, so do not loosen an assertion without a migration plan.
- `npm run e2e` runs Playwright against a deployed URL: set `E2E_BASE_URL` and `E2E_ACCESS_PIN`. Login happens once in `e2e/global-setup.ts` because the login endpoint allows five attempts per five minutes; tests must never log in individually. The suite is read-only and never completes a submission.
- CI runs lint, typecheck, tests, and build on every push. The E2E workflow is manual (workflow_dispatch) and needs the `E2E_ACCESS_PIN` repository secret plus a deployment URL input.

## Operational notes

- `AIRTABLE_PAT` names two independent credentials: the Vercel runtime token and the GitHub Actions backup secret. Different scopes, must not be interchanged.
- Upstash free-tier databases can be deleted for inactivity. The weekly keep-alive workflow pings it (needs the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` repository secrets). If rate limiting silently stops working, check the database still exists.
- Staging: the Swift Maintenance Staging base (appAPER9EoiG6xIQb) mirrors the production schema and holds QA unit SWI999 (engineer pin SWI999, operator pin OPE999). Vercel's Preview environment `AIRTABLE_BASE_ID` points at it so QA and e2e runs never write production data. The PAT must be granted access to both bases. Known staging divergences, all invisible to the app: maintenance_checks.id is plain text instead of autoNumber, submitted_at fields are plain dateTime instead of createdTime, and the display-only lookup fields are not replicated.
- The portal has live users on vessels. Test on a Vercel preview before merging to main.
- Never push, merge, or open a pull request without being asked explicitly.
- Never print or echo secret values, including in error messages or logs.
