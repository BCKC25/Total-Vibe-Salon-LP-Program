"use client";

import { useState } from "react";

// These buttons never call an API. This page is public and unauthenticated
// — per CLAUDE.md, the customer tap page must never change punch/reward
// state on its own. "Redeem now" just tells the customer to show this
// screen to staff; "save for later" needs no action at all, since the
// fob stays frozen at the cap until staff actually redeems it.

export function RewardActions() {
  const [choice, setChoice] = useState<"now" | "later" | null>(null);

  if (choice === "now") {
    return <p style={{ fontSize: 14, color: "var(--ink)" }}>Show this screen to a staff member to redeem it.</p>;
  }

  if (choice === "later") {
    return <p style={{ fontSize: 14, color: "var(--ink)" }}>No problem — it'll be waiting next time you visit.</p>;
  }

  return (
    <div>
      <button
        onClick={() => setChoice("now")}
        style={{
          width: "100%",
          padding: 13,
          background: "var(--ink)",
          color: "var(--ivory)",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        Redeem now
      </button>
      <button
        onClick={() => setChoice("later")}
        style={{
          width: "100%",
          padding: 13,
          background: "transparent",
          color: "var(--ink)",
          border: "0.5px solid var(--ink-faint)",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Save for later
      </button>
    </div>
  );
}
