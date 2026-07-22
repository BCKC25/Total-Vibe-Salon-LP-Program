"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffNav } from "../StaffNav";

// Entry screen for the staff device: tap a fob against the Bluetooth HID
// NFC reader, get routed to its confirm/redeem screen at
// /staff/[fobToken].
//
// This used to use the Web NFC API (NDEFReader), which only works in
// Chrome on Android. The staff device is an iPad, and Safari/iOS has no
// Web NFC support at all — so instead this page just needs a text input
// that's always focused. A Bluetooth HID-mode NFC reader behaves exactly
// like a keyboard: when a tag is tapped, it "types" the tag's hardware
// UID into whatever field has focus, then presses Enter. No app, no
// native code, no Web NFC — see CLAUDE.md "NFC hardware" for the full
// reasoning and the two alternatives that were considered instead.

export default function StaffScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the input focused at all times — staff shouldn't have to tap
  // into it before scanning. Re-focus on mount and whenever focus is
  // lost (e.g. after a lookup finishes).
  useEffect(() => {
    inputRef.current?.focus();
  });

  async function lookupUid(uid: string) {
    setLooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/fobs/lookup-uid?uid=${encodeURIComponent(uid)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't find a fob for that tag");
        return;
      }
      router.push(`/staff/${data.fobToken}`);
    } catch {
      setError("Something went wrong looking up that tag");
    } finally {
      setLooking(false);
      setValue("");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // The reader sends Enter after typing the UID — this is what
    // triggers the lookup. A person typing a UID by hand (for testing,
    // or if the reader is unavailable) can also just press Enter.
    if (e.key === "Enter" && value.trim()) {
      lookupUid(value.trim());
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    // Hard navigation — see SignOutButton.tsx for why router.push isn't
    // used here.
    window.location.href = "/login";
  }

  return (
    <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 300 }}>
        <StaffNav />
      </div>
      <div
        style={{
          maxWidth: 300,
          width: "100%",
          background: "var(--card)",
          border: "0.5px solid var(--gold-line)",
          borderRadius: 16,
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink)", margin: "0 0 20px" }}>
          {looking ? "Looking up fob…" : "Ready — tap a fob"}
        </p>

        {/* Visually a status indicator, but it's a real input so the
            Bluetooth reader's keystrokes land somewhere. autoFocus plus
            the effect above keep it focused between scans. */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => inputRef.current?.focus()}
          autoFocus
          inputMode="none"
          style={{
            width: "100%",
            padding: 14,
            marginBottom: 12,
            border: "0.5px solid var(--gold-line)",
            borderRadius: 10,
            fontSize: 15,
            textAlign: "center",
            color: "var(--ink)",
            background: "var(--ivory)",
          }}
          placeholder="Waiting for tag…"
        />

        <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "0 0 12px" }}>
          Tap a fob against the Bluetooth reader. If it&apos;s not connected,
          you can also type a tag&apos;s UID here and press Enter.
        </p>

        {error && <p style={{ fontSize: 13, color: "var(--ink)", marginBottom: 12 }}>{error}</p>}

        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: 10,
            background: "transparent",
            color: "var(--ink-faint)",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
