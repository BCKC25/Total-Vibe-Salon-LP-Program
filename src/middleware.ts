import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

// Guards /staff/* and the mutating API routes. This is a lightweight
// existence + validity check on the session cookie — the route handlers
// still re-derive locationId from the session themselves rather than
// trusting anything from the request body. See CLAUDE.md "Staff auth".

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(sessionOptions.cookieName)?.value;
  let hasSession = false;

  if (cookie) {
    try {
      const data = await unsealData<SessionData>(cookie, { password: sessionOptions.password });
      hasSession = Boolean(data.locationId);
    } catch {
      hasSession = false;
    }
  }

  if (!hasSession) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // These pages show business data behind a session. Without this, the
  // browser (or Next's client router cache) can serve a cached copy of
  // /dashboard or /staff after logout when the user hits the back
  // button, since no *new* request is made for cache to reject.
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export const config = {
  matcher: ["/staff/:path*", "/dashboard/:path*", "/api/punch", "/api/redeem", "/api/fobs/:path*", "/api/promo-days/:path*", "/api/members"],
};
