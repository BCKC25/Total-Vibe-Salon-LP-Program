import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

// Verifies the shared location PIN and starts a shift session. Anyone at
// that location who knows the PIN can log in — there's no individual
// staff identity here, by design. See CLAUDE.md "Staff auth".

export async function POST(req: NextRequest) {
  const { locationId, pin } = await req.json();

  if (!locationId || !pin) {
    return NextResponse.json({ error: "locationId and pin are required" }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT l.id, l.name, l.pin_hash, l.business_id
     FROM locations l WHERE l.id = $1`,
    [locationId]
  );
  const location = result.rows[0];

  if (!location || !location.pin_hash) {
    return NextResponse.json({ error: "That location isn't set up for login yet" }, { status: 404 });
  }

  const valid = await bcrypt.compare(pin, location.pin_hash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const session = await getSession();
  session.locationId = location.id;
  session.businessId = location.business_id;
  session.locationName = location.name;
  await session.save();

  return NextResponse.json({ ok: true });
}
