"use client";

export function SignOutButton() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    // Hard navigation, not router.push: forces the browser to drop this
    // page from history/cache entirely, so hitting back afterward can't
    // resurrect an authenticated view. See middleware.ts for the
    // matching Cache-Control change.
    window.location.href = "/login";
  }

  return (
    <button
      onClick={logout}
      style={{
        padding: "8px 14px",
        background: "transparent",
        color: "var(--ink-faint)",
        border: "0.5px solid var(--gold-line)",
        borderRadius: 8,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
