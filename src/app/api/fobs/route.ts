import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

// Mints a new fob for the signed-in staff session's business and returns
// the exact URL to write onto a blank NTAG213 with an NFC writer app.
// See README "Programming NFC fobs" and CLAUDE.md "NFC hardware".

export async function POST() {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const fobToken = crypto.randomBytes(6).toString("hex"); // e.g. "a1b2c3d4e5f6"

  await pool.query(
    `INSERT INTO fobs (business_id, fob_token, active) VALUES ($1, $2, true)`,
    [session.businessId, fobToken]
  );

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return NextResponse.json({
    fobToken,
    url: `${baseUrl}/t/${fobToken}`,
  });
}
