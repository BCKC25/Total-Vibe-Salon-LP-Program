import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

// Lists every fob for the signed-in business with all-time punch and
// redemption totals — this is deliberately all-time, unlike the
// "since last redemption" count used on the customer/staff screens
// (see fobStatus.ts), since here the point is identifying a fob/member
// (lost & found, activity history), not deciding reward eligibility.

export async function GET() {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT
       f.id,
       f.fob_token,
       f.member_name,
       f.active,
       f.tag_uid,
       f.created_at,
       COUNT(DISTINCT p.id)::int AS total_punches,
       COUNT(DISTINCT r.id)::int AS total_redeemed
     FROM fobs f
     LEFT JOIN punches p ON p.fob_id = f.id
     LEFT JOIN rewards_redeemed r ON r.fob_id = f.id
     WHERE f.business_id = $1
     GROUP BY f.id
     ORDER BY f.created_at DESC`,
    [session.businessId]
  );

  const members = result.rows.map((row) => ({
    id: row.id,
    fobToken: row.fob_token,
    memberName: row.member_name,
    active: row.active,
    hasTag: Boolean(row.tag_uid),
    createdAt: row.created_at,
    totalPunches: row.total_punches,
    totalRedeemed: row.total_redeemed,
  }));

  return NextResponse.json({ members });
}
