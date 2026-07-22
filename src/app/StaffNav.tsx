"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Small nav shown on every authenticated screen (scanner, dashboard,
// members). Staff and owner see the same three destinations — there's
// no owner-only tier, per CLAUDE.md "Staff auth" — so this is just
// links, not a permissions check.

const LINKS = [
  { href: "/staff", label: "Scanner" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/members", label: "Members" },
];

export function StaffNav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 6, marginBottom: 20 }}>
      {LINKS.map((link) => {
        const active = link.href === "/staff" ? pathname === "/staff" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              textDecoration: "none",
              color: active ? "var(--ivory)" : "var(--ink)",
              background: active ? "var(--ink)" : "transparent",
              border: "0.5px solid var(--gold-line)",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
