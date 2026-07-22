-- Adds support for looking a fob up by its NFC tag's hardware UID, not
-- just by the fob_token encoded in the tag's NDEF URL record.
--
-- Why this is needed: the staff device is an iPad, and Safari/iOS has no
-- Web NFC support at all. The chosen workaround is a Bluetooth HID NFC
-- reader, which "types" data into whatever input has focus, like a
-- keyboard. In that mode, the reader outputs the tag's factory-set
-- hardware UID (a fixed hex serial burned in at manufacture) — it does
-- NOT read the NDEF URL record the way Web NFC did. So there needs to be
-- a second way to find a fob: by tag_uid, in addition to the existing
-- by-fob_token lookup used by the public /t/[fobId] page.
--
-- tag_uid is nullable because older fobs minted before this migration
-- won't have one recorded yet — it gets filled in retroactively the
-- next time someone links that physical tag (see the dashboard's
-- "Link tag" step in MintFob.tsx).

ALTER TABLE fobs ADD COLUMN tag_uid TEXT UNIQUE;

CREATE INDEX idx_fobs_tag_uid ON fobs(tag_uid);
