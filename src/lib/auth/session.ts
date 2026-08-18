import "server-only";

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

/** Verifies the session cookie with firebase-admin. Null when signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
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
}
