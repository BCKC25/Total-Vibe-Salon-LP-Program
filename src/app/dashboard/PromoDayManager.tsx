"use client";

import { useEffect, useState } from "react";

// Lets the owner (or any staff, since there's no owner-only tier yet —
// see CLAUDE.md "Staff auth") set up an occasional multi-punch day like
// "Two Punch Tuesday." Each one is a specific date, not a recurring
// rule — see CLAUDE.md "Promo punch days" for why.

type PromoDay = {
  id: string;
  promoDate: string;
  multiplier: number;
  label: string;
};

function todayLocalISODate(): string {
  // Intentionally a plain local calendar date, not UTC — matches how
  // the date input behaves and how the server compares against
  // CURRENT_DATE (see .env.example TZ and CLAUDE.md "Promo punch days").
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function PromoDayManager() {
  const [promoDays, setPromoDays] = useState<PromoDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [promoDate, setPromoDate] = useState(todayLocalISODate());
  const [multiplier, setMultiplier] = useState(2);
  const [label, setLabel] = useState("Two Punch Tuesday");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/promo-days");
      const data = await res.json();
      if (res.ok) setPromoDays(data.promoDays);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/promo-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoDate, multiplier, label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save this promo day");
        return;
      }
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function cancel(date: string) {
    setError(null);
    const res = await fetch(`/api/promo-days/${date}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't cancel this promo day");
      return;
    }
    await refresh();
  }

  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--gold-line)", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 12, color: "var(--bronze)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Multi-punch days
      </p>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 14px" }}>
        Set up an occasional day (like Two Punch Tuesday) where staff can
        choose to log extra punches per tap.
      </p>

      {!loading && promoDays.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {promoDays.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: "0.5px solid var(--gold-line)",
              }}
            >
              <div>
                <p style={{ fontSize: 13, color: "var(--ink)", margin: 0, fontWeight: 500 }}>{p.label}</p>
                <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: 0 }}>
                  {p.promoDate} — {p.multiplier}x punches
                </p>
              </div>
              <button
                onClick={() => cancel(p.promoDate)}
                style={{
                  padding: "6px 10px",
                  background: "transparent",
                  color: "var(--ink-faint)",
                  border: "0.5px solid var(--ink-faint)",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Date</span>
          <input
            type="date"
            value={promoDate}
            onChange={(e) => setPromoDate(e.target.value)}
            style={{ padding: 8, border: "0.5px solid var(--gold-line)", borderRadius: 8, fontSize: 13 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Punches</span>
          <select
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value))}
            style={{ padding: 8, border: "0.5px solid var(--gold-line)", borderRadius: 8, fontSize: 13 }}
          >
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
            <option value={5}>5x</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Two Punch Tuesday"
            style={{ padding: 8, border: "0.5px solid var(--gold-line)", borderRadius: 8, fontSize: 13 }}
          />
        </label>
        <button
          onClick={save}
          disabled={saving || !label.trim()}
          style={{
            padding: "9px 16px",
            background: "var(--ink)",
            color: "var(--ivory)",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving…" : "Set day"}
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--ink)", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
