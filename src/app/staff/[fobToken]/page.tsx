"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// Staff-facing screen: confirm a punch, or if the fob is already at the
// cap, redeem the reward (or do nothing, for "save for later" — see
// CLAUDE.md, there's deliberately no API call for that case).
//
// locationId is no longer passed around client-side — middleware.ts
// guards this route and /api/punch + /api/redeem derive locationId from
// the signed session cookie set at /login. See CLAUDE.md "Staff auth".

type FobStatus = {
  fobToken: string;
  active: boolean;
  businessName: string;
  customerName: string | null;
  memberName: string | null;
  punchesRequired: number;
  rewardDescription: string;
  punchCount: number;
  rewardReady: boolean;
  activePromo: { multiplier: number; label: string } | null;
};

export default function StaffPunchPage() {
  const { fobToken } = useParams<{ fobToken: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<FobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedForLater, setSavedForLater] = useState(false);
  const [punching, setPunching] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fobs/${fobToken}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load this fob");
      setStatus(data.fob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fobToken]);

  async function confirmPunch(count: number) {
    setError(null);
    setPunching(true);
    try {
      const res = await fetch("/api/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fobToken, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't log the punch");
        return;
      }
      await refresh();
    } finally {
      setPunching(false);
    }
  }

  async function redeemReward() {
    setError(null);
    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fobToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't redeem the reward");
      return;
    }
    setSavedForLater(false);
    await refresh();
  }

  // No API call — declining to redeem needs no state change at all.
  function saveForLater() {
    setSavedForLater(true);
  }

  if (loading) return <Frame><p style={{ fontSize: 14, color: "var(--ink-muted)" }}>Loading…</p></Frame>;
  if (error && !status) return <Frame><p style={{ fontSize: 14, color: "var(--ink)" }}>{error}</p></Frame>;
  if (!status) return null;

  return (
    <Frame>
      {status.rewardReady && !savedForLater && (
        <div style={{ background: "var(--sage-bg)", borderRadius: 8, padding: "10px 12px", marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: "var(--sage)", fontWeight: 500, margin: 0 }}>Reward available</p>
        </div>
      )}

      {status.activePromo && !status.rewardReady && (
        <div style={{ background: "var(--sage-bg)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "var(--sage)", fontWeight: 500, margin: 0 }}>
            {status.activePromo.label} is active today
          </p>
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--bronze)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Member
      </p>
      {status.memberName || status.customerName ? (
        <>
          <p style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 2px", fontWeight: 500 }}>
            {status.memberName ?? status.customerName}
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "0 0 4px", fontFamily: "monospace" }}>
            {status.fobToken}
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 17, color: "var(--ink-faint)", margin: "0 0 2px", fontWeight: 500 }}>
            Unnamed fob
          </p>
          <p style={{ fontSize: 13, color: "var(--ink)", margin: "0 0 4px", fontFamily: "monospace" }}>
            {status.fobToken}
          </p>
        </>
      )}
      <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 22px" }}>
        {status.rewardReady
          ? `${status.punchesRequired} of ${status.punchesRequired} punches — ${status.rewardDescription.toLowerCase()} earned`
          : `${status.punchCount} of ${status.punchesRequired} punches`}
      </p>

      {status.rewardReady ? (
        <>
          <button onClick={redeemReward} style={primaryButton}>Redeem reward</button>
          <button onClick={saveForLater} style={secondaryButton}>Save for later</button>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "12px 0 0", textAlign: "center" }}>
            Saving won&apos;t add another punch this visit
          </p>
        </>
      ) : status.activePromo ? (
        <>
          <button onClick={() => confirmPunch(status.activePromo!.multiplier)} disabled={punching} style={primaryButton}>
            Confirm {status.activePromo.multiplier} punches — {status.activePromo.label}
          </button>
          <button onClick={() => confirmPunch(1)} disabled={punching} style={secondaryButton}>
            Just confirm 1 punch
          </button>
        </>
      ) : (
        <button onClick={() => confirmPunch(1)} disabled={punching} style={primaryButton}>Confirm punch</button>
      )}

      {error && <p style={{ fontSize: 12, color: "var(--ink)", marginTop: 12 }}>{error}</p>}

      {/* Confirming or redeeming lands here and stays here — nothing
          about this screen returns to /staff automatically, so without
          this, staff would have to manually navigate back before they
          could scan the next customer. See CLAUDE.md "Staff auth" /
          the staff scan page comments for the rest of the tap flow. */}
      <button
        onClick={() => router.push("/staff")}
        style={{ ...secondaryButton, marginTop: 14 }}
      >
        Scan next fob
      </button>
    </Frame>
  );
}

const primaryButton: React.CSSProperties = {
  width: "100%",
  padding: 14,
  background: "var(--ink)",
  color: "var(--ivory)",
  border: "none",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
  marginBottom: 8,
};

const secondaryButton: React.CSSProperties = {
  width: "100%",
  padding: 14,
  background: "transparent",
  color: "var(--ink)",
  border: "0.5px solid var(--ink-faint)",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "32px 16px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: 300,
          width: "100%",
          background: "var(--card)",
          border: "0.5px solid var(--gold-line)",
          borderRadius: 16,
          padding: "28px 24px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
