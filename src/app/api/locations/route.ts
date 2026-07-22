import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = 'force-dynamic';

// Public list of locations for the login screen's dropdown. Only name +
// id — never expose pin_hash here. Fine to be unauthenticated for a
// single-business pilot; if this becomes multi-tenant, scope it by
// subdomain/business context instead of returning every location.

export async function GET() {
  const result = await pool.query(
    `SELECT id, name FROM locations ORDER BY name`
  );
  return NextResponse.json({ locations: result.rows });
}
