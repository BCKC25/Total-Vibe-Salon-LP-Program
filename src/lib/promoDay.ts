import { pool } from "@/lib/db";

// A "promo punch day" is a specific calendar date (not a recurring rule)
// where the owner has decided punches count extra — e.g. an occasional
// "Two Punch Tuesday." See db/migrations/004_promo_punch_days.sql and
// CLAUDE.md "Promo punch days".
//
// Dates are compared using Postgres's CURRENT_DATE, which respects the
// session/server timezone (see docker-compose.yml's TZ and
// .env.example) — this must match the business's local timezone or
// "today" here can disagree with the shop's actual calendar day,
// especially late at night.

export type PromoDay = {
  id: string;
  promoDate: string; // YYYY-MM-DD
  multiplier: number;
  label: string;
};

export async function getActivePromoDay(businessId: string): Promise<PromoDay | null> {
  const result = await pool.query(
    `SELECT id, promo_date, multiplier, label FROM promo_punch_days
     WHERE business_id = $1 AND promo_date = CURRENT_DATE`,
    [businessId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    promoDate: row.promo_date,
    multiplier: row.multiplier,
    label: row.label,
  };
}
