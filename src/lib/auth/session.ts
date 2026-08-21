import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "gn_session";

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function createSessionCookie(idToken: string): Promise<void> {
  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  uid: string;
  email: string | null;
  admin: boolean;
};

/**
 * Verifies the session cookie with firebase-admin. Null when signed out.
 *
 * Wrapped in React's `cache` so it runs once per request rather than once
 * per caller. `verifySessionCookie(cookie, true)` checks revocation, which
 * is a real network round trip to Google — and a single interaction asks for
 * the user three times over (the layout, the page, and the server action the
 * page dispatched). Deduplicating them is free and removes two round trips
 * from every authenticated interaction. The cache lives for one request, so
 * a revoked session is still caught on the next one.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
    const store = await cookies();
    const cookie = store.get(SESSION_COOKIE)?.value;
    if (!cookie) return null;
    try {
      const decoded = await adminAuth().verifySessionCookie(cookie, true);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        admin: decoded.admin === true,
      };
    } catch {
      return null;
    }
});
