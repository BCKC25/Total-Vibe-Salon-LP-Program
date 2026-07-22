-- Lets staff attach a name to a fob from the dashboard's new Members
-- screen (src/app/dashboard/members). This is separate from the
-- existing (unused) `customers` table/`fobs.customer_id` — that path
-- was never wired up to any UI, and a full customer record (phone,
-- email, dedup logic) is more than v1 needs. This is just a label:
-- "whose fob is this," mainly so a found fob left at the register can
-- be matched back to a name.

ALTER TABLE fobs ADD COLUMN member_name TEXT;
