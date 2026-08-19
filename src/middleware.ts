import { NextResponse, type NextRequest } from "next/server";
import { analyticsOrigin } from "@/lib/analytics";

const SESSION_COOKIE = "gn_session";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

/**
 * Middleware does an optimistic cookie-presence check for routing UX only.
 * Real verification happens server-side (firebase-admin) in the dashboard
 * and admin layouts — RLS and layout checks are the security boundary, not
 * this redirect.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  let response: NextResponse;

  if (needsAuth && !hasSession) {
    const login = new URL("/login", request.url);
    // Only ever a same-origin pathname — never a full URL (§12 open redirects).
    login.searchParams.set("next", pathname);
    response = NextResponse.redirect(login);
  } else {
    response = NextResponse.next();
  }

  // Empty when analytics is off, so the header gains nothing then.
  const analytics = analyticsOrigin();

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com${analytics ? ` ${analytics}` : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.supabase.co wss://*.supabase.co${analytics ? ` ${analytics}` : ""}`,
    "frame-src https://*.firebaseapp.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico)).*)"],
};
