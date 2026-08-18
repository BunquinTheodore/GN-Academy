"use client";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";

/**
 * §6.2: after any sign-in, sync custom claims (`role: "authenticated"`) and
 * the profile row, force-refresh the token so the claim is present, then
 * mint the httpOnly session cookie from the refreshed token.
 */
export async function completeSignIn(
  user: User,
  options?: { marketingConsent?: boolean },
): Promise<void> {
  const idToken = await user.getIdToken();

  const syncRes = await fetch("/api/auth/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      marketingConsent: options?.marketingConsent,
    }),
  });
  if (!syncRes.ok) {
    const data = await syncRes.json().catch(() => null);
    throw new Error(data?.error ?? "Account sync failed. Try again.");
  }

  // Force refresh so the new claim is inside the token Supabase sees.
  const freshToken = await user.getIdToken(true);

  const sessionRes = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: freshToken }),
  });
  if (!sessionRes.ok) {
    const data = await sessionRes.json().catch(() => null);
    throw new Error(data?.error ?? "Sign-in could not be completed.");
  }
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  marketingConsent: boolean;
}): Promise<void> {
  const cred = await createUserWithEmailAndPassword(
    firebaseAuth,
    input.email,
    input.password,
  );
  await updateProfile(cred.user, { displayName: input.fullName });
  await completeSignIn(cred.user, { marketingConsent: input.marketingConsent });
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<void> {
  const cred = await signInWithEmailAndPassword(
    firebaseAuth,
    input.email,
    input.password,
  );
  await completeSignIn(cred.user);
}

export async function signInWithGoogle(): Promise<void> {
  const cred = await signInWithPopup(firebaseAuth, googleProvider);
  await completeSignIn(cred.user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

export async function signOutEverywhere(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
  await signOut(firebaseAuth);
}

/** Human-readable messages for the Firebase error codes users actually hit. */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect. Check both and try again.";
    case "auth/weak-password":
      return "Password needs at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes, then try again.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before finishing.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    default:
      return error instanceof Error
        ? error.message
        : "Something went wrong. Try again.";
  }
}
