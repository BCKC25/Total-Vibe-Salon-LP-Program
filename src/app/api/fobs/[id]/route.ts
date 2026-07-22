import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getFobStatus } from "@/lib/fobStatus";
import { getSession } from "@/lib/session";

// Looks up a fob by its token (the [id] param is the fob_token, not the
// internal UUID). Used by the staff app to decide whether to show
// "confirm punch" or the reward-ready alert.

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const status = await getFobStatus(params.id);

  if (!status) {
    return NextResponse.json({ error: "Fob not found" }, { status: 404 });
  }

  return NextResponse.json({ fob: status });
}

// Updates a fob. All fields are optional and any combination can be
// sent in one call — the mint flow sends tagUid + memberName together
// (see MintFob.tsx), while the Members screen sends just one field at
// a time for inline edits.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();

  const tagUid = typeof body.tagUid === "string" ? body.tagUid.trim().toUpperCase() : undefined;
  const memberName =
    typeof body.memberName === "string" ? body.memberName.trim() || null : undefined;
  const active = typeof body.active === "boolean" ? body.active : undefined;

  const sets: string[] = [];
  const values: unknown[] = [];
  if (tagUid !== undefined) {
    values.push(tagUid);
    sets.push(`tag_uid = $${values.length}`);
  }
  if (memberName !== undefined) {
    values.push(memberName);
    sets.push(`member_name = $${values.length}`);
  }
  if (active !== undefined) {
    values.push(active);
    sets.push(`active = $${values.length}`);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(params.id, session.businessId);

  try {
    const result = await pool.query(
      `UPDATE fobs SET ${sets.join(", ")}
       WHERE fob_token = $${values.length - 1} AND business_id = $${values.length}
       RETURNING id`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Fob not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Postgres unique_violation — this physical tag is already linked to
    // a different fob (most likely scanned the wrong tag by mistake).
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { error: "This tag is already linked to a different fob" },
        { status: 409 }
      );
    }
    throw err;
  }
}

// Permanently removes a fob (and, via ON DELETE CASCADE, its punches and
// redemption history). Used by the Members screen to clear out old
// fobs entirely rather than just marking them inactive — inactive keeps
// history around for a fob that might turn up later; delete is for
// fobs you know are gone for good and don't want cluttering the list.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.businessId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await pool.query(
    `DELETE FROM fobs WHERE fob_token = $1 AND business_id = $2 RETURNING id`,
    [params.id, session.businessId]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Fob not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
