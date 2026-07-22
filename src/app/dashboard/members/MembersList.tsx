"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  fobToken: string;
  memberName: string | null;
  active: boolean;
  hasTag: boolean;
  createdAt: string;
  totalPunches: number;
  totalRedeemed: number;
};

type SortKey = "newest" | "oldest" | "name" | "punches" | "redeemed";
type StatusFilter = "all" | "active" | "inactive" | "no-tag";

export function MembersList() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  async function refresh() {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't load members");
        return;
      }
      setMembers(data.members);
    } catch {
      setError("Couldn't load members");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function update(fobToken: string, patch: { memberName?: string; active?: boolean }) {
    const res = await fetch(`/api/fobs/${fobToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await refresh();
    return res.ok;
  }

  async function remove(fobToken: string) {
    const res = await fetch(`/api/fobs/${fobToken}`, { method: "DELETE" });
    if (res.ok) await refresh();
    return res.ok;
  }

  if (error) return <p style={{ fontSize: 13, color: "var(--ink)" }}>{error}</p>;
  if (!members) return <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>Loading…</p>;

  const shown = members
    .filter((m) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (m.memberName ?? "").toLowerCase().includes(q) || m.fobToken.toLowerCase().includes(q);
    })
    .filter((m) => {
      if (status === "active") return m.active;
      if (status === "inactive") return !m.active;
      if (status === "no-tag") return !m.hasTag;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          // Unnamed fobs sort to the end regardless of direction.
          if (!a.memberName && !b.memberName) return 0;
          if (!a.memberName) return 1;
          if (!b.memberName) return -1;
          return a.memberName.localeCompare(b.memberName);
        case "punches":
          return b.totalPunches - a.totalPunches;
        case "redeemed":
          return b.totalRedeemed - a.totalRedeemed;
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search by name or fob code…"
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 10,
          border: "0.5px solid var(--gold-line)",
          borderRadius: 8,
          fontSize: 13,
        }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Show</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            style={{ padding: 6, border: "0.5px solid var(--gold-line)", borderRadius: 6, fontSize: 12 }}
          >
            <option value="all">All fobs</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="no-tag">No tag linked</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{ padding: 6, border: "0.5px solid var(--gold-line)", borderRadius: 6, fontSize: 12 }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A–Z)</option>
            <option value="punches">Most punches</option>
            <option value="redeemed">Most redeemed</option>
          </select>
        </label>
      </div>

      {shown.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>No matching fobs.</p>
      )}

      {shown.map((m) => (
        <MemberRow key={m.id} member={m} onUpdate={update} onRemove={remove} />
      ))}
    </div>
  );
}

function MemberRow({
  member,
  onUpdate,
  onRemove,
}: {
  member: Member;
  onUpdate: (fobToken: string, patch: { memberName?: string; active?: boolean }) => Promise<boolean>;
  onRemove: (fobToken: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.memberName ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function saveName() {
    setSaving(true);
    const ok = await onUpdate(member.fobToken, { memberName: name });
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function toggleActive() {
    await onUpdate(member.fobToken, { active: !member.active });
  }

  async function handleRemove() {
    const label = member.memberName || `fob ${member.fobToken}`;
    // Permanent — this also deletes the fob's punch/redemption history
    // (see the DELETE route's cascade note), so confirm before sending.
    if (!window.confirm(`Permanently delete ${label}? This also removes its punch history and can't be undone.`)) {
      return;
    }
    setRemoving(true);
    await onRemove(member.fobToken);
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "0.5px solid var(--gold-line)",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 10,
        opacity: member.active ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Member name"
                autoFocus
                style={{
                  flex: 1,
                  padding: 6,
                  border: "0.5px solid var(--gold-line)",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
              <button
                onClick={saveName}
                disabled={saving}
                style={{
                  padding: "6px 10px",
                  background: "var(--ink)",
                  color: "var(--ivory)",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <p
              onClick={() => setEditing(true)}
              style={{ fontSize: 15, color: "var(--ink)", margin: "0 0 4px", cursor: "pointer" }}
              title="Click to edit name"
            >
              {member.memberName || <span style={{ color: "var(--ink-faint)" }}>Unnamed — click to add a name</span>}
            </p>
          )}
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0, fontFamily: "monospace" }}>
            {member.fobToken}
            {!member.hasTag && " · no physical tag linked"}
            {!member.active && " · inactive"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, textAlign: "right", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)", margin: 0 }}>{member.totalPunches}</p>
            <p style={{ fontSize: 11, color: "var(--bronze)", margin: 0 }}>Punches</p>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)", margin: 0 }}>{member.totalRedeemed}</p>
            <p style={{ fontSize: 11, color: "var(--sage)", margin: 0 }}>Redeemed</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={toggleActive}
          style={{
            padding: "4px 10px",
            background: "transparent",
            color: "var(--ink-faint)",
            border: "0.5px solid var(--ink-faint)",
            borderRadius: 6,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {member.active ? "Mark inactive (lost fob)" : "Reactivate"}
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          style={{
            padding: "4px 10px",
            background: "transparent",
            color: "var(--ink-faint)",
            border: "0.5px solid var(--ink-faint)",
            borderRadius: 6,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {removing ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
