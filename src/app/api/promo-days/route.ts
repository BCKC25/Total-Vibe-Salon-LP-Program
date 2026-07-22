import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

// Manages promo punch days (e.g. an occasional "Two Punch Tuesday") —
// see CLAUDE.md "Promo punch days" and db/migrations/004_promo_punch_days.sql.
// Covered by middleware.ts's /api/... session check like the other
// mutating routes, so no separate auth check needed beyond businessId.
//
// No owner-vs-staff distinction yet (see CLAUDE.md "Staff auth" —
// everyone signed in has the same access), so any signed-in staff
// device can set these up. That's a deliberate v1 simplification, not
// an oversight.

export async function GET() {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Only today-and-future days — past promo days aren't actionable from
  // here, they just stay in punches history as whatever was logged.
  const result = await pool.query(
    `SELECT id, promo_date, multiplier, label FROM promo_punch_days
     WHERE business_id = $1 AND promo_date >= CURRENT_DATE
     ORDER BY promo_date ASC`,
    [session.businessId]
  );

  return NextResponse.json({
    promoDays: result.rows.map((r) => ({
      id: r.id,
      promoDate: r.promo_date,
      multiplier: r.multiplier,
      label: r.label,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { promoDate, multiplier, label } = await req.json();

  if (!promoDate || typeof promoDate !== "string") {
    return NextResponse.json({ error: "promoDate is required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!Number.isInteger(multiplier) || multiplier < 2 || multiplier > 5) {
    return NextResponse.json({ error: "multiplier must be a whole number between 2 and 5" }, { status: 400 });
  }
  if (!label || typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  // Upsert on (business_id, promo_date) — resubmitting for the same
  // date just changes that day's multiplier/label instead of erroring,
  // so correcting a mistake doesn't require a separate delete step.
  const result = await pool.query(
    `INSERT INTO promo_punch_days (business_id, promo_date, multiplier, label)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (business_id, promo_date)
     DO UPDATE SET multiplier = EXCLUDED.multiplier, label = EXCLUDED.label
     RETURNING id, promo_date, multiplier, label`,
    [session.businessId, promoDate, multiplier, label.trim()]
  );

  const row = result.rows[0];
  return NextResponse.json({
    promoDay: { id: row.id, promoDate: row.promo_date, multiplier: row.multiplier, label: row.label },
  });
}
