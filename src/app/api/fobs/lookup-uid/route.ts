import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Used by the staff scan page (src/app/staff/page.tsx) once the
// Bluetooth HID reader types a tag's UID into the scan input. Translates
// that UID into a fob_token so the rest of the app (which is keyed by
// fob_token everywhere else — /staff/[fobToken], /api/punch,
// /api/redeem) doesn't need to change. See CLAUDE.md "NFC hardware".
//
// This route is covered by middleware.ts's /api/fobs/:path* matcher, so
// it already requires a signed-in staff session — no separate auth
// check needed here.

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT fob_token, active FROM fobs WHERE tag_uid = $1`,
    [uid.toUpperCase()]
  );

  const fob = result.rows[0];

  if (!fob) {
    return NextResponse.json(
      { error: "No fob linked to this tag yet. Mint a fob and link this tag from the dashboard first." },
      { status: 404 }
    );
  }

  if (!fob.active) {
    return NextResponse.json({ error: "This fob has been deactivated" }, { status: 404 });
  }

  return NextResponse.json({ fobToken: fob.fob_token });
}
