# Loyalty Punch

Self-hosted NFC loyalty punch-card system. See `CLAUDE.md` for the
architecture and security model before making changes — the important
rule: tapping a fob never logs a punch by itself, only a staff-confirmed
request does.

## Requirements
- Docker + Docker Compose
- Node 20+ (only needed if you want to run things outside Docker)

## Local setup

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres on `localhost:5432` and the Next.js app on
`localhost:3000`.

## Run the schema migrations

The first time (or after adding a new migration file), run each one in
order — they're numbered and additive, never edit one that's already
been applied to a real database:

```bash
docker compose exec db psql -U loyalty -d loyalty -f /migrations/001_init.sql
docker compose exec db psql -U loyalty -d loyalty -f /migrations/002_staff_auth.sql
docker compose exec db psql -U loyalty -d loyalty -f /migrations/003_tag_uid.sql
docker compose exec db psql -U loyalty -d loyalty -f /migrations/004_promo_punch_days.sql
```

## Load seed data (optional, for local testing)

```bash
docker compose cp db/seed.sql db:/seed.sql
docker compose exec db psql -U loyalty -d loyalty -f /seed.sql
```

This creates a test business, location, staff user, and one fob with
token `demo-fob-001`, and sets the location's PIN to `1234`.

## Staff sign-in

Visit `http://localhost:3000/login`, pick the seeded location, and enter
PIN `1234`. This starts a shift session (see `CLAUDE.md` "Staff auth")
that lasts about 16 hours. From there:

- `http://localhost:3000/staff` — the scan screen. The staff device is
  an iPad, so this doesn't use Web NFC (Safari/iOS doesn't support it at
  all). Instead, pair a Bluetooth HID-mode NFC reader with the iPad —
  it types the tapped tag's hardware UID straight into this page's input
  and presses Enter, exactly like a keyboard, which routes straight to
  that fob's confirm/redeem screen. No app, no native code. You can also
  type a UID by hand and press Enter, useful for testing without the
  reader. See "Programming NFC fobs" below for how a tag gets linked to
  a fob in the first place.
- `http://localhost:3000/staff/demo-fob-001` — the same screen directly,
  useful for testing without physical NFC hardware.
- `http://localhost:3000/t/demo-fob-001` — the customer-facing status
  page (public, no login).
- `http://localhost:3000/dashboard` — punch feed, metrics, and the
  "mint a new fob" button. Behind the same session as `/staff` — owner
  and staff see identical data, there's no separate owner-only login.

To see the reward-ready / frozen state, punch the demo fob 10 times
(the seeded business defaults to `punches_required = 10`), then reload
either page.

## Multi-punch days

From `/dashboard`, you can mark a specific date as a multi-punch day
(e.g. an occasional "Two Punch Tuesday") — pick a date, a multiplier
(2x–5x), and a label. On that date, `/staff/[fobToken]` shows it as an
option: staff can confirm the extra punches, or still confirm just 1 for
a customer who isn't part of the promo that visit. See CLAUDE.md "Promo
punch days" for the full design.

**This depends on your server's timezone matching the shop's local
time** — set `TZ` in `.env` (see `.env.example`) to your actual
timezone, or "today" in the app can disagree with the shop's real
calendar day late at night.

## Programming NFC fobs

Each fob just needs one NDEF URL record written to it, pointing at that
fob's `/t/[fobToken]` page. Nothing else lives on the tag — no app,
no secrets, just a URL, which is why an NTAG213 with a few hundred bytes
of memory is plenty (see the earlier hardware sourcing discussion).

**1. Mint a fob token.** Sign in at `/login`, go to `/dashboard`, and
click **Mint a new fob**. This returns a URL like
`http://localhost:3000/t/a1b2c3d4e5f6` — that's what gets written onto
the physical tag.

**2. Write that URL onto a blank NTAG213.** Any NFC-capable phone works
for writing, Android or iPhone (iOS 13+ supports third-party NFC writing,
not just reading). A free app like **NFC Tools** (by wakdev, available
on both app stores) is enough:

- Open NFC Tools → **Write** → **Add a record** → **URL/URI**
- Paste in the fob's URL exactly as returned (e.g.
  `https://totalvibesalon.com/t/a1b2c3d4e5f6` — placeholder, no domain
  registered yet, see "Deploying to a VPS" for what to use in the
  meantime)
- Tap **Write**, then hold the blank fob against the back of the phone
  until it confirms

**3. Test before locking.** Tap the freshly written fob with any phone
and confirm it opens the right status page.

**4. Optionally lock the tag.** NFC Tools has a **Write protection** /
**make read-only** option. Locking a tag after writing means it can
never be rewritten by anyone again, including you — a stronger version
of "only updated at the business location" than just keeping the writer
app off customers' phones. Only lock it after step 3 confirms the URL is
correct; there's no undo.

**5. At real volume**, ask your NFC supplier (Seritag, GoToTags, etc.)
about pre-encoding — giving them a list of URLs to write at the factory
before the fobs ship, so you're not hand-writing hundreds of tags one at
a time.

**6. Link the tag's UID.** This step is new and specific to the iPad +
Bluetooth reader setup: right after minting a fob on `/dashboard`, an
input appears under the URL asking you to tap that same physical tag
against the Bluetooth reader. This records the tag's hardware UID
against the fob, which is what `/staff` looks fobs up by at the
register (see CLAUDE.md "NFC hardware" for why a UID lookup is needed
instead of just reading the URL). Skipping this step means the tag will
still work fine for customers tapping it themselves at `/t/[fobToken]`,
but staff won't be able to scan it at the register until it's linked.

**Why staff don't also write anything at punch time:** the tag is
read-only in normal use — see CLAUDE.md "Punch security model". The
"only updated at the business location" requirement is satisfied by
provisioning happening in-house (steps 1-4 above), not by anything staff
do at the register.

## Deploying to a VPS

Same `docker compose up --build -d` on any VPS with Docker installed —
that's the point of keeping this self-hosted for the pilot. Swap the
`Dockerfile` for a production multi-stage build (`next build` +
`next start`) when you're ready to move off `next dev`, and put a reverse
proxy (Caddy or nginx) in front for HTTPS. See `vps-crash-course.md`
(shared alongside this repo, not part of the git history) for a full
walkthrough written for someone doing this for the first time — picking
a provider, SSH keys, first-time server setup, getting this repo
running, HTTPS, backups, and an everyday command cheat sheet.

## What's not built yet
See `CLAUDE.md` "What's stubbed / not built yet" for the authoritative,
up-to-date list.
