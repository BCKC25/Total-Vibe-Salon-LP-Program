# Loyalty Punch — project context for Claude Code

## Product priorities — read this first
- **The physical NFC tap is the entire selling point.** The business
  signed on specifically because of it, after years on a costlier
  digital punch-card system they got tired of paying for. Don't treat
  "drop NFC, fall back to manual lookup" as a casual simplification or
  a starting preference — it's a last-resort fallback only, and giving
  it up would undercut the reason this product exists.
- **The person building this has limited coding experience and limited
  NFC/RFID hardware experience.** Explanations in this repo (comments,
  docs, commit messages) should assume little prior knowledge, not just
  be technically correct. When in doubt, explain more, not less.
- **Cost minimization is a running priority** — this is why the stack is
  self-hosted with no Vercel/Supabase, and why hardware choices default
  to the cheapest option that still delivers the real NFC tap
  experience. A single Bluetooth HID NFC reader per staff device is an
  accepted cost; adding hardware beyond that should be questioned.

## What this is
A multi-tenant NFC loyalty punch-card system. Customers carry an NFC key fob.
Tapping it opens a status page but does NOT log a punch. A staff member
confirms the punch on their own logged-in device. This is the core security
model — see "Punch security model" below. Don't change it without a good
reason.

## Current stage
Self-hosted proof of concept, single business. Deliberately NOT using
Vercel or Supabase — everything runs in Docker Compose on one VPS
(Postgres + Next.js). Multi-tenant tables exist from day one so it's not a
rewrite when a second business signs on, but there's no billing, no
onboarding flow, and no admin UI for creating new businesses yet — that's
all deferred until after the pilot proves out.

## Stack
- Next.js 14 (App Router, TypeScript)
- Postgres 16 (plain `pg` client, no ORM yet — add one later if the raw
  SQL gets unwieldy)
- Docker Compose for local + VPS deployment
- No auth provider wired in yet (staff login is a TODO — see below)

## Punch security model (read before touching auth/punch code)
1. `/t/[fobId]` — public page, loads on customer tap. Read-only. Shows fob
   status. Must never have a code path that logs a punch by itself.
2. `POST /api/punch` — the only way a punch gets logged. Must require a
   valid staff session tied to a specific `location_id`. This is what
   makes punching "only possible at the business location" — not
   anything about the fob or the tag content.
3. Fobs are static NTAG213 — same URL every tap, never rewritten. Don't
   assume the fob content can express state; it can't.

## Data model
See `db/migrations/001_init.sql` for the source of truth. Summary:
`businesses` → `locations` → `staff_users`
`businesses` → `fobs` → `customers` (optional link)
`punches` and `rewards_redeemed` reference `fob_id`, `location_id`,
`staff_user_id`.
Every table that isn't a pure join carries `business_id` (directly or via
FK) so tenant isolation can be enforced later — either at the query layer
or with Postgres RLS if we ever move to a per-tenant-aware DB role.

## Brand — Total Vibe Salon
Second tenant, forked from the Elevate Aiken pilot repo (Loyalty-Punch)
into its own repo/deployment rather than made a second row in one
shared instance — see "Multi-tenant schema" note below for why that
option exists but wasn't taken. Hair, makeup, and cosmetics business.
Tokens live in `src/app/globals.css` as CSS custom properties — always
reference them (`var(--gold)` etc.), never hardcode the hex values
elsewhere.
- `--ivory` (#fdf1f3) page background, `--card` (#fffbfc) card surface —
  blush pink, drawn from the logo
- `--ink` (#1a1414) primary text, `--ink-muted`, `--ink-faint` for
  secondary/tertiary text
- `--gold` (#d68fa0) is the one accent (variable name kept from the
  original tenant for minimal diff — it's a dusty rose here, not gold) —
  used for the progress ring and label accents only, not decoration
- `--sage` (#7c8a63) is reserved for reward-earned / success states only,
  unchanged from the original tenant — it reads as "success" against
  the pink background and there was no brand reason to change it
- Serif (`var(--font-serif)`, Playfair Display) is for the business name
  and reward moments only. Everything functional — labels, buttons,
  numbers — uses the sans (`var(--font-sans)`, Inter). Don't recreate the
  logo's script "Vibe" lettering in live UI text; it doesn't hold up at
  small sizes, the logo stays an image asset.
- This palette/type pairing is specific to this tenant's actual brand,
  same as it was for Elevate Aiken. If a third business ever needs this
  app, revisit whether per-tenant theming (keyed by business_id) is worth
  building instead of forking a third repo.

## Multi-tenant schema (inherited, currently unused)
The `businesses` table and `business_id` FK on every core table were
built multi-tenant from day one (see db/migrations/001_init.sql), so in
principle Total Vibe Salon could have been added as a second row in the
Elevate Aiken database instead of a second deployment. That path was not
taken — this repo is a full fork with its own app instance and database
— for isolation (a bug or migration mistake in one business's deploy
can't touch the other's data) and because per-tenant theming wasn't
built (see "Brand" above). The `/api/locations` route still has a known
gap noted inline: it returns every location across every business
unscoped, which was fine for a single tenant but would need fixing
before two businesses could safely share one instance.

## Reward-ready / frozen state
A fob's punch count is punches *since the last redemption*, not all-time
— see `src/lib/fobStatus.ts` (`getFobStatus`). Once that count reaches
`punches_required`, the fob is `rewardReady` and FROZEN:
- `POST /api/punch` refuses to log a new punch while `rewardReady` is
  true (409 response) — this is what stops punches from compiling past
  the cap.
- `POST /api/redeem` is the only way out of the frozen state — it writes
  a row to `rewards_redeemed`, which resets the count going forward
  since `getFobStatus` only counts punches after the most recent
  redemption.
- There is intentionally no "save for later" endpoint. Declining to
  redeem requires no API call — the fob just stays frozen until someone
  does redeem it. See the comment in `src/app/staff/[fobToken]/page.tsx`.
- The customer tap page (`src/app/t/[fobId]/`) never calls either
  mutating route, even when showing "redeem now" / "save for later" —
  see `RewardActions.tsx`. That page is public and unauthenticated, so
  it stays informational only, consistent with the punch security model
  above.
- `src/app/staff/[fobToken]/page.tsx` has a "Scan next fob" button that
  routes back to `/staff`. Without it, staff would be stuck on one
  customer's confirm screen with no way back to the scan input short of
  the browser back button — confirming or redeeming never navigates
  anywhere on its own.

## Staff auth
Shared location PIN, not individual staff accounts — the shop wants
"anyone on staff, one code per location," not per-employee logins. See
`locations.pin_hash` (migration `002_staff_auth.sql`), `/login`,
`/api/login`, and `src/lib/session.ts`.
- Session is an encrypted cookie via `iron-session` (no server-side
  session store, no Redis — fits the self-hosted/no-vendor approach).
  Contents: `locationId`, `businessId`, `locationName`. No individual
  staff identity — `staff_users` and `staff_user_id` columns still exist
  in the schema but are unused for now; a natural future step if
  per-staff attribution or accountability becomes important.
- Session lasts ~16 hours (`SESSION_MAX_AGE_SECONDS` in `session.ts`) —
  meant to cover a full shift/day without re-entering the PIN.
- `src/middleware.ts` guards `/staff/*`, `/dashboard/*`, `/api/punch`,
  `/api/redeem`, and `/api/fobs/*`. It only checks that a valid session
  cookie exists; route handlers still independently pull
  `locationId`/`businessId` from the session rather than trusting
  anything in the request body.
- Deliberately no separate owner-only tier: the dashboard is behind the
  same shift session as the punch/redeem screens. Owner and staff see
  identical data (recent punches, metrics, and the ability to mint new
  fobs) — this was a product decision, not a placeholder. If that ever
  needs to change (e.g. hiding financial data from staff), it'll need a
  real role check, not just "is there a session."

## Production deploy
`docker-compose.yml` + `Dockerfile` run `next dev` — good for local
iteration (hot reload), bad for a real VPS: every route recompiles on
first hit, which on a modest droplet is slow enough to look broken (this
is what caused the punch rate limit to look "stuck" during testing —
impatient re-clicks during the compile lag kept landing inside the
10-second window).

For the VPS, use `docker-compose.prod.yml` + `Dockerfile.prod` instead:
a real multi-stage build (`next build` once, then `next start`), no
source volume mount — code changes need `git pull` + rebuild, not live
editing.

```bash
docker compose down                                   # stop the dev version
docker compose -f docker-compose.prod.yml up --build -d
```

Same named Postgres volume (`db_data`) is reused since both compose
files live in the same project directory — existing migrations/seed
data carry over, no need to re-run them after switching.

**`COOKIE_SECURE` matters here.** `src/lib/session.ts`'s cookie
`secure` flag is deliberately controlled by `COOKIE_SECURE` in `.env`,
not `NODE_ENV` — `next start` sets `NODE_ENV=production` automatically,
and if the cookie's `secure` flag followed that blindly, switching to
this production build would silently break login the moment it's not
served over HTTPS (browsers drop Secure cookies over plain HTTP with no
visible error). Leave `COOKIE_SECURE=false` until Caddy/HTTPS is set up
per `vps-crash-course.md`, then flip it to `true` — that's a real
security requirement once HTTPS exists, not optional at that point.

## Domain + HTTPS
Not set up yet — currently served over plain HTTP directly on the
droplet's IP, which is fine for testing but not for real customers or
staff (see "Production deploy" above re: `COOKIE_SECURE`). Once the
owner provides a domain, the switchover is:

1. **Point DNS at the droplet.** Add an A record for the domain (or a
   subdomain like `app.` or `loyalty.`) to the droplet's public IP, at
   whatever registrar the domain is with. Propagation can take a few
   minutes to a few hours.
2. **Edit `./Caddyfile`** — replace `REPLACE_WITH_YOUR_DOMAIN.com` with
   the real domain.
3. **Update `.env`** — set `APP_BASE_URL=https://yourdomain.com` (this
   is what gets written onto new NFC tags going forward — existing
   tags already written with the IP-based URL will need to be
   rewritten once this changes, see README "Programming NFC fobs") and
   set `COOKIE_SECURE=true` (see "Production deploy" above for why this
   matters — it's not optional once real HTTPS exists).
4. **Start Caddy and restart the app:**
   ```bash
   docker compose -f docker-compose.prod.yml --profile caddy up --build -d
   ```
   Caddy fetches a free Let's Encrypt certificate automatically the
   first time it starts against a real, DNS-resolving domain — no
   manual cert steps, and it renews itself indefinitely.
5. **Verify** `https://yourdomain.com/dashboard` loads with a valid
   padlock, then confirm `http://<droplet-ip>:3000` still responds (it
   will, until you additionally choose to close port 3000 at the
   firewall — optional hardening once HTTPS is confirmed working,
   forcing all traffic through Caddy).

## NFC hardware
Tags are static NTAG213, written once at provisioning with a single NDEF
URL record pointing at `/t/[fobToken]` — see README "Programming NFC
fobs" for the full workflow (mint via `POST /api/fobs`, write with a
phone + NFC Tools app, optionally lock the tag after testing).

**Staff device is an iPad (decided)** — the original `/staff/page.tsx`
was built around the Web NFC API (`NDEFReader`), which only exists in
Chrome on Android and does not exist on iOS/Safari at all, no
exceptions. That's why it was replaced with a **Bluetooth HID NFC
reader**: the reader connects to the iPad over Bluetooth and types the
tag's data into the page like a keyboard, so it works in Safari with no
native app needed. This decision came from client demand — most
prospective clients for this product want to use Apple devices.

**Implemented.** HID-mode readers type the tag's factory-set hardware
**UID** (a fixed hex serial), not the NDEF URL written onto it. A UID
can't be set to match `fob_token` — it's burned in at manufacture — so:
- `fobs.tag_uid` (migration `003_tag_uid.sql`) stores it, nullable
  since older fobs won't have one until linked.
- `PATCH /api/fobs/[fobToken]` (in `src/app/api/fobs/[id]/route.ts`)
  links a UID to an already-minted fob. Used by the new "link tag" step
  in `MintFob.tsx` — mint a fob, write its URL to the tag, then tap the
  same tag against the Bluetooth reader (or type the UID) to link it.
- `GET /api/fobs/lookup-uid?uid=...` translates a UID into a
  `fob_token`. Already covered by `middleware.ts`'s
  `/api/fobs/:path*` matcher, so it requires a signed-in staff session.
- `src/app/staff/page.tsx` no longer uses Web NFC. It's now an
  always-focused text input: the Bluetooth reader "types" the UID and
  presses Enter, which triggers the lookup and routes to
  `/staff/[fobToken]` exactly as before. Typing a UID by hand and
  pressing Enter works too, for testing without the physical reader.
- UIDs are stored and compared uppercased (trimmed) in both the lookup
  and link routes — don't add a third casing convention elsewhere.

The other two options considered and not chosen: a native iOS app using
Core NFC (technically cleaner, reads the URL directly, but needs a paid
Apple Developer account and a second codebase — too much for a v1
pilot), and dropping the physical tap for staff entirely in favor of
manual customer lookup (cheapest, but undercuts the whole reason this
product exists — see "Product priorities" above).

**Hardware:** the paragraph below describes what was ordered for the
Elevate Aiken pilot this repo was forked from — Total Vibe Salon needs
its own reader + fobs procured separately, not a reuse of that order.
The approach (Bluetooth HID-mode reader, UID-typing) still applies;
only the specific purchase needs repeating. Original note, kept for
reference: an ACS ACR1555U USB Bluetooth NFC Reader + 10 NTAG213 key
fobs, from GoToTags. One setup caveat for whoever provisions it: the
ACR1555U ships in a normal reader/writer mode and needs a one-time
switch into Bluetooth HID keyboard mode via ACS's own configuration
tool before it'll work with this app's UID-typing approach — that step
has historically required a Windows/Mac computer, not the iPad. Do
that switch before testing the actual tap flow.

## What's stubbed / not built yet
- No individual staff accounts/attribution (see "Staff auth" above —
  `staff_users` table exists but is unused)
- No Stripe/billing — out of scope until multi-business
- No per-tenant theming — brand tokens are hardcoded globals for this
  single tenant (Total Vibe Salon), same as they were in the Elevate
  Aiken repo this was forked from (see "Brand" above)
- **In-app "how to" section (long-term, not built).** Owner and staff
  should be able to see, from within the app itself, how to mint a new
  fob and link its tag, and how to read the dashboard's data — not just
  rely on `README.md`, which the actual users of the app will likely
  never open. Natural home is probably a `/help` route linked from the
  dashboard, written in plain non-technical language consistent with
  "Product priorities" above. Not scoped or started yet.

## Punch rate limiting
`POST /api/punch` rejects a punch if the same fob was punched within the
last `DOUBLE_TAP_WINDOW_SECONDS` (10s, in `src/app/api/punch/route.ts`).
This is a courtesy guard against accidental double-taps — the reader
registering the same tap twice, or a staff member tapping the confirm
button twice by mistake — not a security boundary. It applies regardless
of `count`, so a legitimate multi-punch promo day still only takes one
`/api/punch` call (see "Promo punch days" below), it just inserts
several rows in one transaction rather than calling the endpoint
repeatedly.

## Promo punch days
Lets the owner mark a specific date as a multi-punch day — e.g. an
occasional "Two Punch Tuesday" — without any recurring schedule to
maintain. This was a deliberate design choice: the business does this
occasionally, not every Tuesday, so a plain per-date row is simpler than
a recurring rule with its own on/off toggle.
- `db/migrations/004_promo_punch_days.sql` — `promo_punch_days` table,
  one row per `(business_id, promo_date)`, `multiplier` constrained to
  2–5.
- `src/lib/promoDay.ts` (`getActivePromoDay`) — reads today's promo for
  a business, if any. Compares against Postgres's `CURRENT_DATE`, which
  is why `TZ` matters in `docker-compose.yml`/`.env.example` — without
  it the DB defaults to UTC and "today" can disagree with the shop's
  actual local day, especially late at night.
- `src/lib/fobStatus.ts` now includes `activePromo` on every
  `FobStatus`, so the staff confirm screen (`/staff/[fobToken]`) can
  show it as an option without a separate request.
- `POST /api/punch` accepts an optional `count`. A `count` above 1 is
  only accepted if it exactly matches today's active promo multiplier
  for that fob's business — it is deliberately not a general "log N
  punches" API a client could call with an arbitrary number.
  `count` punches are inserted as a single transaction.
- `src/app/dashboard/PromoDayManager.tsx` + `POST`/`GET /api/promo-days`
  and `DELETE /api/promo-days/[date]` — lets whoever's signed in (owner
  or staff, since there's no owner-only tier yet, see "Staff auth"
  above) set up or cancel a promo day from the dashboard. Creating a
  promo day for a date that already has one *updates* it rather than
  erroring, so fixing a mistake doesn't need a separate delete step.
- On the staff confirm screen, an active promo is shown as a genuine
  *option*, not a forced default — staff can still choose "just confirm
  1 punch" even while a promo is active, e.g. for a customer who isn't
  part of the promo that visit.

## Conventions
- Keep SQL migrations additive and numbered (`002_...sql`, `003_...sql`).
  Never edit a migration that's already been applied to a real database.
- API routes live under `src/app/api/*/route.ts`, App Router style.
- DB access goes through `src/lib/db.ts` — a single shared `pg` Pool.
  Don't create new pools elsewhere.
