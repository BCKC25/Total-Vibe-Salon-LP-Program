"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type Location = { id: string; name: string };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  // Lets links/redirects say where to land after login, e.g.
  // /login?next=/dashboard. Falls back to /staff (the register screen)
  // since that's what staff open the app to most.
  const next = searchParams.get("next") ?? "/staff";
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        setLocations(data.locations ?? []);
        if (data.locations?.[0]) setLocationId(data.locations[0].id);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, pin }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't log in");
      return;
    }
    // Hard navigation, not router.push: this guarantees the destination
    // page is fetched fresh from the server with the new session cookie,
    // rather than potentially being served from Next's client-side
    // router cache.
    window.location.href = next;
  }

  return (
    <div style={{ padding: "32px 16px", display: "flex", justifyContent: "center" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 300,
          width: "100%",
          background: "var(--card)",
          border: "0.5px solid var(--gold-line)",
          borderRadius: 16,
          padding: "28px 24px",
        }}
      >
        <Image
          src="/tvs-logo.png"
          alt="Total Vibe Salon"
          width={1024}
          height={1024}
          style={{ height: "auto", width: 72, margin: "0 auto 16px", display: "block" }}
          priority
        />
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink)", margin: "0 0 20px", textAlign: "center" }}>
          Staff sign in
        </p>

        <label style={{ fontSize: 12, color: "var(--bronze)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Location
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6, marginBottom: 16, borderRadius: 8, border: "0.5px solid var(--gold-line)" }}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>

        <label style={{ fontSize: 12, color: "var(--bronze)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          PIN
        </label>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6, marginBottom: 20, borderRadius: 8, border: "0.5px solid var(--gold-line)" }}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: 14,
            background: "var(--ink)",
            color: "var(--ivory)",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        {error && <p style={{ fontSize: 13, color: "var(--ink)", marginTop: 12 }}>{error}</p>}
      </form>
    </div>
  );
}
