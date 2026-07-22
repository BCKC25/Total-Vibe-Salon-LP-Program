# Total Vibe Salon — Loyalty Punch: project log

## Forked from Elevate Aiken (Wed July 22)
This repo started as a copy of the Elevate Aiken Loyalty-Punch codebase
— second tenant, own repo, own deployment (see CLAUDE.md "Multi-tenant
schema" for why a single shared instance wasn't used instead). Business
is hair, makeup, and cosmetics, run mostly through social media with no
dedicated domain yet. Everything below this point through the rest of
the log is inherited history from the Elevate Aiken pilot — kept as-is
for context on *why* the app is built the way it is, not because it
describes this business. New entries for Total Vibe Salon work go above
this note, newest first.

---

# Elevate Aiken — Loyalty Punch: project log (inherited history)

## Business context (learned tonight, important going forward)
- **The physical NFC tap is the entire selling point** — this is why
  Elevate Aiken reached out in the first place, after years on a more
  expensive digital punch-card system. Not a feature to simplify away.
- You have limited coding experience and limited NFC/RFID hardware
  experience — plan for explanations that assume little prior
  knowledge, not just correct steps.
- Cost minimization is a running priority, but a single Bluetooth HID
  reader per staff device is an accepted cost — the constraint is
  "minimize hardware," not "zero extra hardware at any cost."

## Staff device: decided (Wed July 22)
iPad, confirmed — most prospective clients for this product want to use
Apple devices, so this isn't just about Elevate Aiken. Going with a
**Bluetooth HID NFC reader** — works in Safari with no native app, but
reads the tag's hardware UID rather than the URL. **Built today:**
- `db/migrations/003_tag_uid.sql` — `fobs.tag_uid` column
- `PATCH /api/fobs/[fobToken]` — links a UID to a fob
- `GET /api/fobs/lookup-uid` — UID → fob_token
- `MintFob.tsx` — new "link tag" step right after minting
- `staff/page.tsx` — rewritten as an always-focused input instead of
  Web NFC; the reader's keystrokes + Enter drive the lookup

Still needed: actually order a Bluetooth HID reader (ACS ACR1555U or
ACS1552U were the two discussed — make sure "HID Keyboard" mode is
selected) and test the real tap flow with it once it arrives.

## Wed July 22 — VPS crash course
A from-scratch VPS walkthrough was written and shared as
`vps-crash-course.md` (not part of the git repo — a standalone doc):
picking a provider, SSH keys, first-time server hardening, installing
Docker, getting this repo running, HTTPS via Caddy, deploying updates,
and — importantly — daily Postgres backups. Worth reading before doing
the actual VPS setup, not just referencing it as you go.

## Wed July 22 (later) — punch rate limiting + promo punch days
Two things built together since they touch the same endpoint:

**Rate limiting.** `/api/punch` now rejects a punch if that same fob was
punched in the last 10 seconds — guards against accidental double-taps
(reader double-registering a tap, or a fast double-click). Not a
security feature, just a courtesy check.

**Promo punch days.** You can now mark a specific date (e.g. an
occasional Two Punch Tuesday) as a multi-punch day right from the
dashboard — pick a date, a multiplier (2x–5x), and a label. On that day,
the staff confirm screen shows the promo as an *option* — "Confirm 2
punches — Two Punch Tuesday" alongside "Just confirm 1 punch" — so staff
can still punch normally for a customer not part of the promo. It's a
specific date, not a recurring rule, since you said this happens
occasionally rather than every week. Set one up wrong? Just resubmit the
same date with the correct multiplier/label, or hit Cancel.

One dependency worth knowing: this reads "today" from the database,
which needed a timezone set (`TZ=America/New_York` in `.env.example` and
`docker-compose.yml`) so it agrees with the shop's actual local day
rather than defaulting to UTC.

Still no owner-vs-staff distinction — anyone signed in can set these up,
per your instruction to treat all staff as owner-level for now.

## Wed July 22 (later) — hardware ordered, delayed by funding
Full order is staged at GoToTags: 10x NTAG213 key fobs + an **ACS
ACR1555U USB Bluetooth NFC Reader** (~$59) — this is exactly the reader
model flagged earlier as supporting Bluetooth HID keyboard emulation,
so no surprises there. Can't be placed until next week pending funding.

**Adjusting the Friday goal accordingly:** the "order + test real
hardware" step (was priority #4) can't happen before Friday's demo now.
The demo itself can still go end-to-end using manual UID entry at
`/staff` (type a UID, press Enter — already supported, see
`src/app/staff/page.tsx`) to simulate a tap without the physical reader.
Real hardware testing becomes the first thing to do once the order
ships and arrives, likely early-to-mid next week.

**One thing to plan for once the reader arrives:** ACS's documentation
describes the ACR1555U shipping in its normal reader/writer mode, with
a one-time step to switch it into Bluetooth HID keyboard mode using
ACS's own configuration tool — this setup step has historically needed
a Windows or Mac computer, not the iPad itself, though exact steps can
vary by firmware version. Worth budgeting 15–30 minutes for that
one-time setup separate from the "does it work at the register" test.
Once it's in HID mode, no app or drivers are needed day-to-day — it
just pairs with the iPad over Bluetooth and types.

## Long-term backlog (not part of the Friday demo)
- **In-app "how to" section** — the owner and staff should be able to
  see, inside the app itself, how to mint/link a new fob and how to read
  the dashboard data, rather than needing to open `README.md`. Tracked
  in `CLAUDE.md` "What's stubbed / not built yet". Not scoped yet —
  revisit after the pilot is running.

## Goal
A working demo running end-to-end by **Friday, July 24**. A few hours a
day between now and then.

## Where things stand (as of Tue July 21, evening)

### Built and working
- Multi-tenant schema: businesses, locations, staff_users, customers,
  fobs, punches, rewards_redeemed
- Punch security model: the fob tap page is read-only, only a
  staff-confirmed request logs a punch
- Reward-ready / frozen state: punches stop compiling once a fob hits
  the cap, "save for later" needs no API call at all, "redeem" is the
  only way to reset the count
- Brand system applied throughout: ivory/ink/gold/bronze/sage palette,
  Playfair Display + Inter, the gold progress ring on the customer page
- Staff auth: shared per-location PIN via iron-session (~16hr shift
  session), `/login`, `/staff` (NFC scan entry), `/staff/[fobToken]`
  (confirm/redeem screen)
- Dashboard: same session as staff (no separate owner tier, by design —
  owner and staff see identical data), metric cards, recent punches,
  "mint a new fob" button
- NFC provisioning workflow documented end-to-end in the README
  (mint → write with NFC Tools → test → optionally lock)
- Fixed a critical Next.js vulnerability (bumped 14.2.5 → 14.2.35) and a
  cookie-handling vulnerability in iron-session (8.0.3 → 8.0.4) found
  while testing tonight

### Decided, not yet built
- **Staff device: undecided.** Choice is Android phone/tablet + Chrome
  (Web NFC, no extra hardware) vs. iPad + Bluetooth HID NFC reader
  (~$50-150 extra device, but keeps iPad). Doesn't block any code —
  only blocks ordering hardware. If iPad, the fallback path needs a
  UID-based lookup added (see `CLAUDE.md` "NFC hardware") since HID-mode
  readers type the tag's hardware UID, not the URL we write to it.

### Known gaps (see `CLAUDE.md` "What's stubbed / not built yet" for the
authoritative list — this is just the short version)
- No rate limiting on `/api/punch` (accidental double-taps)
- No individual staff accounts (shared PIN only, `staff_users` table
  unused)
- Still running on `next dev`, not a production build
- Two remaining npm audit findings (moderate + high) only clear with a
  Next.js 14→16 major bump — deliberately not done tonight, real
  breaking change, needs its own testing pass

### Tried tonight and blocked
Attempted to spin up a live preview inside this sandbox (Postgres +
Next.js dev server + a headless-browser screenshot of the real running
dashboard). Postgres and the app server both worked fully — logged in
with a real session, ran real queries against seeded data. The
screenshot step failed: this sandbox's Chromium/Firefox are both
snap-only packages and the snap store isn't reachable from here, so
there's no headless browser available to capture a picture. **The fix is
running this on your own machine** (or eventually the VPS) — see
README "Local setup", same `docker compose up --build` as always. That's
probably the first thing worth doing tomorrow, since "does it actually
run for me" is more useful than anything else at this point.

## Priority order for the rest of the week
1. **Get it running on your machine** — the sandbox can't give you a
   live preview, so this needs to happen somewhere you can actually see
   it. This is the real blocker on "demo by Friday."
2. **VPS walkthrough** — from zero server experience: what a VPS is,
   picking a provider, first-time setup, basic security, deploying this
   app onto it, connecting a domain with HTTPS. Also covering how
   GitHub fits in (code storage, not hosting — see chat for the full
   explanation) and whether/how to automate deploys from it.
3. **Bluetooth HID NFC reader implementation** — add `fobs.tag_uid`,
   a way to capture it at provisioning, and a UID-based staff scan flow
   to replace the current Android-only Web NFC version
4. Order an actual Bluetooth HID reader and test the real tap flow
5. Provision a couple of real fobs using the NFC Tools workflow
6. Rate-limit `/api/punch`
7. If time allows: a production build + basic deploy

## Picking this back up
Everything above (and the full technical detail behind each decision) is
also in `CLAUDE.md` at the repo root — that's the file to point Claude
Code at directly. This log is for us; `CLAUDE.md` is for the coding
agent.
