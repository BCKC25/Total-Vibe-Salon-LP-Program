import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getFobStatus } from "@/lib/fobStatus";
import { getSession } from "@/lib/session";

// This is the only endpoint that logs a punch. middleware.ts already
// confirmed a session cookie exists before this handler runs; here we
// pull locationId from that session rather than trusting the request
// body — see CLAUDE.md "Punch security model" before changing this.
//
// Still no individual staff identity (see CLAUDE.md "Staff auth") — this
// is a shared location PIN, so staff_user_id stays null for now.

// Guards against accidental double-taps — same fob, staff device double
// registers the tap, or someone taps twice in quick succession by
// mistake. This is a courtesy delay, not a security boundary. See
// CLAUDE.md "Punch rate limiting".
const DOUBLE_TAP_WINDOW_SECONDS = 10;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.locationId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { fobToken, count } = await req.json();
  if (!fobToken) {
    return NextResponse.json({ error: "fobToken is required" }, { status: 400 });
  }

  // Default is a normal single punch. A count above 1 is only ever
  // valid on an active promo punch day, and only for that day's exact
  // multiplier — this isn't a general "log N punches" API. See
  // CLAUDE.md "Promo punch days" for why it's restricted this way
  // rather than accepting any number the client sends.
  const requestedCount = typeof count === "number" ? count : 1;
  if (!Number.isInteger(requestedCount) || requestedCount < 1) {
    return NextResponse.json({ error: "count must be a positive whole number" }, { status: 400 });
  }

  const status = await getFobStatus(fobToken);

  if (!status || !status.active) {
    return NextResponse.json({ error: "Fob not found or inactive" }, { status: 404 });
  }

  if (requestedCount > 1 && status.activePromo?.multiplier !== requestedCount) {
    return NextResponse.json(
      { error: "That punch count isn't valid right now — check today's active promo" },
      { status: 400 }
    );
  }

  // Frozen at the cap: don't let punches keep compiling once a reward is
  // ready. Staff should redeem or leave it — either way, no new punch.
  if (status.rewardReady) {
    return NextResponse.json(
      { error: "Reward already available — redeem it instead of punching" },
      { status: 409 }
    );
  }

  const recentPunch = await pool.query(
    `SELECT created_at FROM punches
     WHERE fob_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [status.id]
  );

  if (recentPunch.rows[0]) {
    const secondsSinceLastPunch =
      (Date.now() - new Date(recentPunch.rows[0].created_at).getTime()) / 1000;
    if (secondsSinceLastPunch < DOUBLE_TAP_WINDOW_SECONDS) {
      return NextResponse.json(
        { error: "This fob was just punched moments ago — wait a few seconds and try again if that wasn't a mistake" },
        { status: 429 }
      );
    }
  }

  // Insert all requested punches (normally just 1) as a single
  // transaction, so a promo-day multi-punch either fully lands or
  // fully fails rather than logging a partial count.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let lastPunch;
    for (let i = 0; i < requestedCount; i++) {
      const result = await client.query(
        `INSERT INTO punches (fob_id, location_id)
         VALUES ($1, $2)
         RETURNING id, created_at`,
        [status.id, session.locationId]
      );
      lastPunch = result.rows[0];
    }
    await client.query("COMMIT");
    return NextResponse.json({ punch: lastPunch, count: requestedCount });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
