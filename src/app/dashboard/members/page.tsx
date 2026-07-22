import { StaffNav } from "../../StaffNav";
import { MembersList } from "./MembersList";

// Behind the same shift session as /dashboard (see middleware.ts) —
// same reasoning: owner and staff see identical data, no separate
// owner-only tier for v1.

export default function MembersPage() {
  return (
    <div style={{ padding: "32px 20px", maxWidth: 720, margin: "0 auto" }}>
      <StaffNav />
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)", margin: "0 0 6px" }}>
        Members
      </p>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 20px" }}>
        Every fob that's been minted, with lifetime punches and rewards
        redeemed. Add a name so a fob left at the register can be
        matched to its owner, or mark a lost fob inactive.
      </p>
      <MembersList />
    </div>
  );
}
