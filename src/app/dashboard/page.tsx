import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MintFob } from "./MintFob";
import { PromoDayManager } from "./PromoDayManager";
import { SignOutButton } from "./SignOutButton";
import { StaffNav } from "../StaffNav";

// Behind the same shift session staff use to punch cards — see
// CLAUDE.md "Staff auth". Owner and staff see identical data by design;
// there's no separate owner-only tier for v1.
//
// All queries are scoped to session.businessId so this stays correct
// once a second business exists, even though only one does today.

export default async function DashboardPage() {
  const session = await getSession();
  const businessId = session.businessId;

  if (!businessId) {
    return null; // middleware.ts should already have redirected to /login
  }

  const [membersResult, punchesTodayResult, redeemedResult, recentResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM fobs WHERE business_id = $1 AND active = true`,
      [businessId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM punches p
       JOIN fobs f ON f.id = p.fob_id
       WHERE f.business_id = $1 AND p.created_at >= date_trunc('day', now())`,
      [businessId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM rewards_redeemed r
       JOIN fobs f ON f.id = r.fob_id
       WHERE f.business_id = $1`,
      [businessId]
    ),
    pool.query(
      `SELECT p.created_at, f.fob_token, l.name AS location_name
       FROM punches p
       JOIN fobs f ON f.id = p.fob_id
       JOIN locations l ON l.id = p.location_id
       WHERE f.business_id = $1
       ORDER BY p.created_at DESC
       LIMIT 25`,
      [businessId]
    ),
  ]);

  return (
    <div style={{ padding: "32px 20px", maxWidth: 720, margin: "0 auto" }}>
      <StaffNav />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)", margin: 0 }}>Dashboard</p>
        <SignOutButton />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Members" value={membersResult.rows[0].count} accent="gold" />
        <MetricCard label="Punches today" value={punchesTodayResult.rows[0].count} accent="gold" />
        <MetricCard label="Rewards redeemed" value={redeemedResult.rows[0].count} accent="sage" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <MintFob />
      </div>

      <div style={{ marginBottom: 20 }}>
        <PromoDayManager />
      </div>

      <div style={{ background: "var(--card)", border: "0.5px solid var(--gold-line)", borderRadius: 12, padding: "4px 20px" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--bronze)" }}>
              <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 500 }}>When</th>
              <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 500 }}>Fob</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 500 }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {recentResult.rows.map((row, i) => (
              <tr key={i} style={{ borderTop: "0.5px solid var(--gold-line)", color: "var(--ink)" }}>
                <td style={{ padding: "10px 0" }}>{new Date(row.created_at).toLocaleString()}</td>
                <td style={{ padding: "10px 0" }}>{row.fob_token}</td>
                <td style={{ padding: "10px 0", textAlign: "right" }}>{row.location_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: "gold" | "sage" }) {
  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--gold-line)", borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 12, color: accent === "gold" ? "var(--bronze)" : "var(--sage)", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 500, color: "var(--ink)", margin: 0 }}>{value}</p>
    </div>
  );
}
