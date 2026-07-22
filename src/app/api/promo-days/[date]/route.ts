import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

// Cancels a promo punch day the owner set up by mistake, or just
// changed their mind about. See CLAUDE.md "Promo punch days".

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await pool.query(
    `DELETE FROM promo_punch_days WHERE business_id = $1 AND promo_date = $2 RETURNING id`,
    [session.businessId, params.date]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "No promo day found for that date" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
