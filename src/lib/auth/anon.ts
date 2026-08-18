import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const ANON_COOKIE = "gn_anon";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read the anonymous visitor id, minting one if absent (route handlers only). */
export async function getOrSetAnonId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(ANON_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return id;
}

export async function getAnonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_COOKIE)?.value ?? null;
}
