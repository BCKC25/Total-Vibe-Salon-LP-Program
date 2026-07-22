import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

// Location-level session, not per-staff — a shift session covers
// whoever's working that location. See CLAUDE.md "Staff auth".
export type SessionData = {
  locationId?: string;
  businessId?: string;
  locationName?: string;
};

const SESSION_MAX_AGE_SECONDS = 16 * 60 * 60; // ~ a full shift/day, see CLAUDE.md

// Deliberately NOT tied to NODE_ENV. `next start` (production mode) sets
// NODE_ENV=production automatically, which would otherwise flip this to
// `secure: true` the moment the VPS moves off `next dev` — and a Secure
// cookie is silently dropped by the browser over plain HTTP, breaking
// login with no obvious error. Until Caddy/HTTPS is set up (see
// CLAUDE.md "Production deploy"), this stays false regardless of build
// mode. Set COOKIE_SECURE=true in .env once the site is served over
// HTTPS — that's a real security requirement at that point, not
// optional.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

export const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "loyalty_punch_session",
  ttl: SESSION_MAX_AGE_SECONDS,
  cookieOptions: {
    secure: COOKIE_SECURE,
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
