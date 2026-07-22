import Image from "next/image";
import { getFobStatus } from "@/lib/fobStatus";
import { RewardActions } from "./RewardActions";

// Public page a customer lands on when they tap their fob.
// IMPORTANT: this page must stay read-only w.r.t. punches/redemptions.
// It identifies the fob and shows status only. See CLAUDE.md.

const RING_RADIUS = 60;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default async function FobStatusPage({
  params,
}: {
  params: { fobId: string };
}) {
  const status = await getFobStatus(params.fobId);

  if (!status) {
    return <Card><p>This card isn&apos;t recognized. Please ask staff for help.</p></Card>;
  }

  if (!status.active) {
    return <Card><p>This card has been deactivated. Please ask staff for help.</p></Card>;
  }

  const fraction = Math.min(status.punchCount / status.punchesRequired, 1);
  const offset = RING_CIRCUMFERENCE * (1 - fraction);

  return (
    <Card>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ margin: "0 auto 4px", display: "block" }}>
        <circle cx={70} cy={70} r={RING_RADIUS} fill="none" stroke="var(--gold-line)" strokeWidth={6} />
        <circle
          cx={70}
          cy={70}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
        <text x={70} y={66} textAnchor="middle" fontSize={28} fontWeight={500} fill="var(--ink)">
          {status.punchCount}
        </text>
        <text x={70} y={86} textAnchor="middle" fontSize={13} fill="var(--bronze)">
          of {status.punchesRequired}
        </text>
      </svg>
      {/* Logo image, not text — the script "Vibe" lettering doesn't hold up
          re-created in live UI text at small sizes. See CLAUDE.md "Brand". */}
      <Image
        src="/tvs-logo.png"
        alt={status.businessName}
        width={1024}
        height={1024}
        style={{ height: "auto", width: 110, margin: "8px auto 4px", display: "block" }}
        priority
      />
      <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 18px" }}>Hair &bull; Makeup &bull; Cosmetics</p>

      {status.rewardReady ? (
        <>
          <p style={{ fontSize: 15, color: "var(--sage)", fontWeight: 500, margin: "0 0 18px" }}>
            {status.rewardDescription} earned
          </p>
          <RewardActions />
        </>
      ) : (
        <p style={{ fontSize: 14, color: "var(--ink)", margin: 0 }}>
          {status.punchesRequired - status.punchCount} more punches to {status.rewardDescription.toLowerCase()}
        </p>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "32px 16px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: 300,
          width: "100%",
          background: "var(--card)",
          border: "0.5px solid var(--gold-line)",
          borderRadius: 16,
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
