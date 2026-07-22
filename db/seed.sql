-- Local dev seed data. Not run automatically — see README for how to load it.

INSERT INTO businesses (id, name, punches_required, reward_description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Coffee Shop', 10, 'Free coffee')
ON CONFLICT DO NOTHING;

-- PIN is "1234" (bcrypt hash below) — for local dev only, change before
-- any real deployment.
INSERT INTO locations (id, business_id, name, pin_hash)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Hayne Ave', '$2b$10$jY18mJaJF8FctLMpAET5o.7kxepg/wnm4SCV5xRfShQVQgHA1LSoO')
ON CONFLICT DO NOTHING;

INSERT INTO staff_users (id, business_id, location_id, email, role)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'owner@testcoffee.example', 'owner')
ON CONFLICT DO NOTHING;

INSERT INTO fobs (id, business_id, fob_token, active)
VALUES ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'demo-fob-001', true)
ON CONFLICT DO NOTHING;
