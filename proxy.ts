/**
 * Route protection (Next 16 "proxy" convention — dawniej middleware.ts).
 *
 * IMPORTANT: This runs in Edge runtime — it must NOT import anything that
 * uses Node.js APIs. We import `auth.config.ts` (Edge-safe) instead of
 * `lib/auth.ts` (which pulls in fs, bcrypt, proper-lockfile).
 *
 * Tworzy własną lekką instancję NextAuth, która tylko CZYTA JWT (sesja/rola).
 * Nie uwierzytelnia użytkowników — to dzieje się w route API (Node.js runtime).
 */

import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // ── Admin routes ──────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return redirectToLogin(req);
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // ── Representative panel ──────────────────────────────────
  if (pathname.startsWith("/panel")) {
    if (!user) {
      return redirectToLogin(req);
    }
    if (user.role !== "representative" && user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // ── Client-only routes (logged-in required) ───────────────
  if (
    pathname.startsWith("/kampanie") ||
    pathname.startsWith("/koszyk") ||
    pathname.startsWith("/kreator") ||
    pathname.startsWith("/ustawienia")
  ) {
    if (!user) {
      return redirectToLogin(req);
    }
  }

  // ── Redirect logged-in users away from auth pages ─────────
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/register"))
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

function redirectToLogin(req: { url: string; nextUrl: { pathname: string } }) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - api (handled by route handlers)
     *   - _next/static, _next/image (static assets)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - uploads (public media files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|uploads).*)",
  ],
};
