-- Adds shared location PIN auth. One PIN per location; any staff member
-- at that location uses the same PIN to start a shift session. See
-- CLAUDE.md "Staff auth" for why this is location-level, not per-staff.

ALTER TABLE locations ADD COLUMN pin_hash TEXT;
