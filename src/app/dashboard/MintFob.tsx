"use client";

import { useState } from "react";

// Replaces the raw curl call from the README with an actual button.
// Calls POST /api/fobs (session-protected by middleware.ts) and shows
// the resulting URL to write onto a blank NTAG213 — see README
// "Programming NFC fobs" for the rest of that workflow.
//
// Also handles the "link tag" step needed for the Bluetooth HID reader
// path: after the URL is written to the tag, tap that same tag against
// the Bluetooth reader once here to capture its hardware UID, which is
// what the staff scan page (/staff) looks fobs up by at the register.
// See CLAUDE.md "NFC hardware".

export function MintFob() {
  const [result, setResult] = useState<{ fobToken: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tagUid, setTagUid] = useState("");
  const [memberName, setMemberName] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);

  async function mint() {
    setLoading(true);
    setError(null);
    setCopied(false);
    setLinked(false);
    setLinkError(null);
    setTagUid("");
    setMemberName("");
    const res = await fetch("/api/fobs", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't create a new fob");
      return;
    }
    setResult(data);
  }

  async function copyUrl() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
  }

  async function linkTag() {
    if (!result || !tagUid.trim()) return;
    setLinking(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/fobs/${result.fobToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Name and tag get saved together in one call — the whole point
        // is not having to remember to go add the name separately on
        // the Members screen afterward. memberName is optional; leaving
        // it blank just links the tag with no name, same as before.
        body: JSON.stringify({ tagUid: tagUid.trim(), memberName: memberName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error ?? "Couldn't link this tag");
        return;
      }
      setLinked(true);
    } catch {
      setLinkError("Something went wrong linking this tag");
    } finally {
      setLinking(false);
    }
  }

  function onTagUidKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Same pattern as the staff scan page: the Bluetooth reader types
    // the UID then presses Enter, so Enter triggers the link instead of
    // requiring a separate button tap.
    if (e.key === "Enter" && tagUid.trim()) {
      linkTag();
    }
  }

  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--gold-line)", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 12, color: "var(--bronze)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        New fob
      </p>

      {!result ? (
        <button
          onClick={mint}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: "var(--ink)",
            color: "var(--ivory)",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {loading ? "Creating…" : "Mint a new fob"}
        </button>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 8px" }}>
            Write this URL onto a blank fob with an NFC writer app, then test it before locking the tag:
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <code style={{ fontSize: 13, background: "var(--sage-bg)", padding: "6px 10px", borderRadius: 8, wordBreak: "break-all" }}>
              {result.url}
            </code>
          </div>
          <button
            onClick={copyUrl}
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: "var(--ink)",
              border: "0.5px solid var(--ink-faint)",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
          <button
            onClick={() => setResult(null)}
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: "var(--ink)",
              border: "0.5px solid var(--ink-faint)",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Mint another
          </button>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--gold-line)" }}>
            {linked ? (
              <p style={{ fontSize: 13, color: "var(--sage)", fontWeight: 500, margin: 0 }}>
                Tag linked{memberName.trim() ? ` to ${memberName.trim()}` : ""} — this fob is ready to use at the register.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 8px" }}>
                  Whose fob is this? (Optional — you can always add it later on the Members screen.)
                </p>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Member name"
                  style={{
                    width: "100%",
                    padding: 10,
                    marginBottom: 12,
                    border: "0.5px solid var(--gold-line)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--ink)",
                    background: "var(--ivory)",
                  }}
                />
                <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 8px" }}>
                  Now tap this same tag against the Bluetooth reader to link
                  it (or type its UID and press Enter):
                </p>
                <input
                  type="text"
                  value={tagUid}
                  onChange={(e) => setTagUid(e.target.value)}
                  onKeyDown={onTagUidKeyDown}
                  placeholder="Waiting for tag…"
                  style={{
                    width: "100%",
                    padding: 10,
                    marginBottom: 8,
                    border: "0.5px solid var(--gold-line)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--ink)",
                    background: "var(--ivory)",
                  }}
                />
                <button
                  onClick={linkTag}
                  disabled={linking || !tagUid.trim()}
                  style={{
                    padding: "8px 14px",
                    background: "var(--ink)",
                    color: "var(--ivory)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {linking ? "Linking…" : "Link tag"}
                </button>
                {linkError && <p style={{ fontSize: 12, color: "var(--ink)", marginTop: 8 }}>{linkError}</p>}
              </>
            )}
          </div>
        </div>
      )}


      {error && <p style={{ fontSize: 13, color: "var(--ink)", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
