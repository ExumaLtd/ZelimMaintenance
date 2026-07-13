# Zelim Maintenance Portal

A mobile-first maintenance and fault-reporting portal for the Zelim SWIFT
Survivor Recovery System, a piece of maritime safety equipment installed on
vessels. Maintenance engineers and vessel operators scan a QR code on a unit,
enter (or auto-fill) an access code, complete the relevant checklist, attach
photos, videos and a signature, and submit. Submissions are written to Airtable
and emailed as formatted reports.

## Architecture overview

The portal is a Next.js application using the Pages Router, deployed on Vercel.
There is no separate backend service: server-side logic lives in Next.js API
routes and in `getServerSideProps` on the page routes. Airtable is the system of
record.

High-level request flow:

1. A user opens the landing page (`/`) and enters an access code, or scans a QR
   code that contains one.
2. `GET /api/swift-resolve-pin` looks the code up in Airtable and returns the
   unit's public token and the access level (maintenance or operator).
3. `POST /api/create-session` independently re-resolves the code server-side and
   issues a signed session cookie. The unit token and access level written into
   the session are always derived from Airtable, never taken from the client.
4. The user is sent to `/portal/swift`. A proxy (Next.js middleware, in
   `proxy.js`) validates the session and rewrites the request to the internal
   `/swift/<token>/...` route using the token stored in the session.
5. Each form page loads its unit and checklist data in `getServerSideProps`,
   re-checking the session and confirming the URL token matches the session.
6. Drafts auto-save through `POST /api/save-draft`; completion and submission go
   through `POST /api/mark-draft-complete`, `POST /api/submit-maintenance` and
   `POST /api/send-report`.

Supporting integrations:

- File uploads (photos, videos, PDFs, the signature image) go directly from the
  browser to Cloudinary, using a short-lived signature minted server-side by
  `POST /api/cloudinary-sign`. The Cloudinary secret never reaches the client.
- Voice notes are transcribed by `POST /api/transcribe-elevenlabs`, which proxies
  audio to ElevenLabs. The ElevenLabs key is server-side only.
- Reverse geocoding for the maintenance location uses
  `GET /api/reverse-geocode`, which proxies OpenStreetMap Nominatim.
- Report emails are rendered with react-email and sent via Resend.

## Tech stack

- Next.js 16 (Pages Router), React 19, TypeScript
- Airtable (datastore), accessed through the `airtable` SDK and the REST API
- Upstash Redis with `@upstash/ratelimit` for rate limiting, lockout counters
  and the submission reference counter
- Cloudinary for signed media uploads
- Resend with react-email for report emails
- ElevenLabs for speech-to-text
- Sentry for error monitoring
- `@ducanh2912/next-pwa` for the installable, offline-capable shell
- three.js and `@react-three` for the vessel view
- Vercel for hosting; GitHub Actions and Dropbox for daily backups

## Project structure

- `pages/` route pages and API routes (`pages/api`)
- `pages/swift/[id]/` the per-unit dashboard and the five maintenance forms
- `lib/` server-side helpers (`session.ts`, `resolve-pin.ts`, `data-fetching.ts`)
- `components/` shared client components (uploader, signature pad, voice input)
- `emails/` react-email templates
- `utils/` small shared helpers (`api-utils.ts` holds `esc` and `getClientIp`)
- `proxy.js` session-checking middleware for portal routes
- `scripts/` backup jobs run by the GitHub Action
- `.github/workflows/dropbox-backup.yml` the daily backup workflow

## Required environment variables

Names only. Never commit values. Local development uses `.env.local` (which is
gitignored); production values are set in the Vercel project settings.

Application runtime (set in Vercel):

- `SESSION_SECRET` secret used to HMAC-sign the session cookie
- `AIRTABLE_API_KEY` Airtable access token for the app
- `AIRTABLE_BASE_ID` Airtable base identifier
- `AIRTABLE_SWIFT_TABLE` name of the SWIFT units table
- `UPSTASH_REDIS_REST_URL` Upstash Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` Upstash Redis REST token
- `CLOUDINARY_API_KEY` Cloudinary API key (returned to the client inside the
  signed upload parameters)
- `CLOUDINARY_API_SECRET` Cloudinary signing secret (server-side only)
- `ELEVENLABS_API_KEY` ElevenLabs speech-to-text key
- `RESEND_API_KEY` Resend email API key
- `BASE_URL` canonical site URL used to build absolute links in emails (optional)
- `NEXT_PUBLIC_BASE_URL` public fallback for `BASE_URL` (optional)

Build time:

- `SENTRY_AUTH_TOKEN` used by the Sentry build plugin to upload source maps
  (kept in `.env.sentry-build-plugin`, which is gitignored)

Backup workflow (GitHub Actions repository secrets, not application runtime):

- `AIRTABLE_PAT` scoped Airtable personal access token used by the backup job
- `DROPBOX_APP_KEY`
- `DROPBOX_APP_SECRET`
- `DROPBOX_REFRESH_TOKEN`
- `VERCEL_TOKEN`

## Local development

1. Install dependencies: `npm install`
2. Create `.env.local` and set the application runtime variables listed above.
3. Start the dev server: `npm run dev`
4. Preview email templates: `npm run email:dev`

## Backup and restore

### What is backed up

A GitHub Action (`.github/workflows/dropbox-backup.yml`) runs every day at 00:00
GMT and can also be triggered manually with `workflow_dispatch`. Each run:

1. Exchanges the Dropbox refresh token for a short-lived access token.
2. Runs `scripts/airtable-backup.js`, which exports every Airtable table as JSON
   to `/Airtable/<year>/<month>/<day>/` in Dropbox. Backups are incremental: a
   state file at `/Airtable/_backup_state.json` records the timestamp of the last
   run, and only records modified since then are fetched.
3. Runs `scripts/vercel-backup.js`, which stores the Vercel environment variable
   names and metadata (not their values) to `/Vercel/<year>/<month>/<day>/`.
4. Zips the repository source (excluding `node_modules` and `.git`) and uploads
   it to `/GitHub/<year>/<month>/<day>/`.

### Restore procedure

- Source code: the GitHub repository is the source of truth. Restore by checking
  out the repository, or by unzipping the most recent code archive from the
  `/GitHub` folder in Dropbox.
- Airtable data: download the per-table JSON files for the date you want from the
  `/Airtable` folder and re-import them into the Airtable base (via the Airtable
  API or CSV import). Because the daily backup is incremental, a single day's
  folder only contains records changed that day. To produce a complete point-in
  -time export for a clean restore, delete `/Airtable/_backup_state.json` in
  Dropbox and run the workflow manually once. The next run with no state file
  performs a full export of every table.
- Environment variables: the Vercel backup stores variable names and metadata
  only. Secret values are intentionally excluded and must be restored from your
  password manager or secret store, then re-entered in the Vercel project
  settings. Rotate any secret you believe may have been exposed rather than
  reusing it.

## Security model

### Access codes (PINs)

The portal is used by maintenance engineers and vessel operators in the field,
frequently on personal or shared mobile devices, with no corporate identity
system to authenticate against. Access is therefore by a per-unit access code
rather than per-user login. Each unit carries two codes, an engineer code and an
operator code, which map to the two access levels. Codes are distributed as a QR
code on or near the unit so a technician can start work quickly, which matters
for a safety-critical tool that may be used in difficult conditions at sea.

This model trades individual user identity for low-friction field access. To
keep that trade acceptable, the code lookup is always performed server-side, the
resulting access level cannot be chosen by the client, and the login endpoint is
rate limited and locked out as described below.

### Sessions

On a successful code lookup, `POST /api/create-session` issues a `portal_session`
cookie. This endpoint is authoritative: it re-resolves the code against Airtable
and derives the unit token and access level from the matched record, ignoring any
token or access level supplied in the request body. The cookie is:

- `HttpOnly`, so it is not readable by page JavaScript
- `Secure` in production, so it is only sent over HTTPS
- `SameSite=Lax`
- valid for 8 hours

The cookie payload is base64-encoded JSON signed with HMAC-SHA256 using
`SESSION_SECRET`. It is signed, not encrypted, so it is tamper-evident but its
contents (including the access code) are readable by anyone who holds the raw
cookie. The `HttpOnly` and `Secure` flags are what keep the cookie out of reach
in normal operation. The signature is verified with a constant-time comparison,
and expired sessions are rejected.

Every layer re-checks authorisation rather than trusting an upstream one:

- The proxy middleware validates the signature and expiry before rewriting a
  portal request to its internal unit route.
- Each page's `getServerSideProps` re-validates the session and confirms the URL
  token matches the session token, so one unit's session cannot load another
  unit's data.
- Each API route validates the session, and routes that accept a record ID
  (draft save and complete, submission) confirm the record belongs to the
  session before acting on it.

### Rate limiting and lockout

The access-code endpoint is protected by two independent controls, both backed
by Upstash Redis:

- A per-IP sliding window: 5 attempts per 5 minutes.
- A per-PIN lockout: 5 failed attempts lock that specific code for 15 minutes,
  regardless of source IP, so an attacker cannot brute force a single code by
  rotating IP addresses. A successful lookup clears the counter.

Other API routes carry their own per-IP limits sized to their expected use (for
example draft saves allow frequent auto-saves, while email sends are tightly
capped).

### Redis fail-open decision

If Upstash Redis is unreachable, the rate limiter and the per-PIN lockout log a
warning and allow the request to proceed rather than blocking it. This is a
deliberate availability decision. The portal is a safety-critical maintenance
tool used on vessels, and locking a legitimate technician out because a rate
limiting backend is temporarily down is a worse outcome than briefly weakened
brute-force protection. The controls resume automatically as soon as Redis is
reachable again.
