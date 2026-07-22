-- Lets the owner mark a specific calendar date as a multi-punch day
-- (e.g. an occasional "Two Punch Tuesday") without any code changes or
-- a recurring schedule to maintain. One row per business per date — see
-- src/lib/promoDay.ts for how this is read, and CLAUDE.md "Promo punch
-- days" for the full design writeup.
--
-- Deliberately date-specific rather than "every Tuesday": the business
-- does this occasionally, not on a fixed schedule, so a recurring rule
-- would need its own on/off toggle anyway — a plain date is simpler and
-- covers the actual use case.

CREATE TABLE promo_punch_days (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    promo_date      DATE NOT NULL,
    multiplier      INTEGER NOT NULL CHECK (multiplier >= 2 AND multiplier <= 5),
    label           TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, promo_date)
);

CREATE INDEX idx_promo_punch_days_business_date ON promo_punch_days(business_id, promo_date);
