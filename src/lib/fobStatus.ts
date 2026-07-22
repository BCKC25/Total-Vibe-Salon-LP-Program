import { pool } from "@/lib/db";
import { getActivePromoDay, PromoDay } from "@/lib/promoDay";

// A fob's "punch count" is not all-time — it's punches since the last
// redemption. Once that count reaches punches_required, the fob is
// "reward ready" and FROZEN: no further punches should be logged until
// someone actually redeems. This is what makes "save for later" free to
// implement with zero extra state — declining to redeem simply leaves
// the fob frozen at the cap, and the reward stays there next visit.

export type FobStatus = {
  id: string;
  fobToken: string;
  active: boolean;
  businessId: string;
  businessName: string;
  customerName: string | null;
  memberName: string | null;
  punchesRequired: number;
  rewardDescription: string;
  punchCount: number;
  rewardReady: boolean;
  activePromo: PromoDay | null;
};

export async function getFobStatus(fobToken: string): Promise<FobStatus | null> {
  const fobResult = await pool.query(
    `SELECT f.id, f.fob_token, f.active, f.member_name, b.id AS business_id, b.name AS business_name,
            b.punches_required, b.reward_description, c.name AS customer_name,
            (SELECT MAX(created_at) FROM rewards_redeemed r WHERE r.fob_id = f.id) AS last_redeemed_at
     FROM fobs f
     JOIN businesses b ON b.id = f.business_id
     LEFT JOIN customers c ON c.id = f.customer_id
     WHERE f.fob_token = $1`,
    [fobToken]
  );

  const fob = fobResult.rows[0];
  if (!fob) return null;

  const [punchResult, activePromo] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM punches
       WHERE fob_id = $1 AND ($2::timestamptz IS NULL OR created_at > $2)`,
      [fob.id, fob.last_redeemed_at]
    ),
    getActivePromoDay(fob.business_id),
  ]);

  const punchCount = punchResult.rows[0].count;

  return {
    id: fob.id,
    fobToken: fob.fob_token,
    active: fob.active,
    businessId: fob.business_id,
    businessName: fob.business_name,
    customerName: fob.customer_name,
    memberName: fob.member_name,
    punchesRequired: fob.punches_required,
    rewardDescription: fob.reward_description,
    punchCount,
    rewardReady: punchCount >= fob.punches_required,
    activePromo,
  };
}
