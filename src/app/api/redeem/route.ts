import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getFobStatus } from "@/lib/fobStatus";
import { getSession } from "@/lib/session";

// The only endpoint that redeems a reward. Same session-derived
// locationId approach as /api/punch — see the comment there.
//
// There is deliberately no "save for later" endpoint. Declining to
// redeem requires no API call at all — the fob just stays frozen at the
// cap until someone does redeem it.

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.locationId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { fobToken } = await req.json();
  if (!fobToken) {
    return NextResponse.json({ error: "fobToken is required" }, { status: 400 });
  }

  const status = await getFobStatus(fobToken);

  if (!status || !status.active) {
    return NextResponse.json({ error: "Fob not found or inactive" }, { status: 404 });
  }

  if (!status.rewardReady) {
    return NextResponse.json({ error: "No reward available yet" }, { status: 409 });
  }

  const redemption = await pool.query(
    `INSERT INTO rewards_redeemed (fob_id, location_id)
     VALUES ($1, $2)
     RETURNING id, created_at`,
    [status.id, session.locationId]
  );

  return NextResponse.json({ redemption: redemption.rows[0] });
}
