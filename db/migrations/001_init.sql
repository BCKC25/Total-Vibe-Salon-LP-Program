-- Initial schema for the loyalty punch system.
-- Multi-tenant from day one: every non-join table carries business_id
-- (directly or via a foreign key chain) even though v1 only serves one
-- business, so adding a second business later is not a migration event.

CREATE TABLE businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    punches_required INTEGER NOT NULL DEFAULT 10,
    reward_description TEXT NOT NULL DEFAULT 'Free item',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
    email           TEXT NOT NULL UNIQUE,
    role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name            TEXT,
    phone           TEXT,
    email           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    fob_token       TEXT NOT NULL UNIQUE, -- the token encoded in the NFC URL
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE punches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fob_id          UUID NOT NULL REFERENCES fobs(id) ON DELETE CASCADE,
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    staff_user_id   UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rewards_redeemed (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fob_id          UUID NOT NULL REFERENCES fobs(id) ON DELETE CASCADE,
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    staff_user_id   UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_business_id ON locations(business_id);
CREATE INDEX idx_staff_users_business_id ON staff_users(business_id);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_fobs_business_id ON fobs(business_id);
CREATE INDEX idx_fobs_fob_token ON fobs(fob_token);
CREATE INDEX idx_punches_fob_id ON punches(fob_id);
CREATE INDEX idx_punches_location_id ON punches(location_id);
CREATE INDEX idx_rewards_redeemed_fob_id ON rewards_redeemed(fob_id);
