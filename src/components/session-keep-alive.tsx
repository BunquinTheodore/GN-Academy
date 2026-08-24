"use client";

import { useEffect } from "react";
import { firebaseAuth, onIdTokenChanged } from "@/lib/firebase/client";

/**
 * Keeps an active learner signed in.
 *
 * The session cookie is minted once at sign-in with a five day life and, until
 * this existed, nothing ever renewed it. Somebody three chapters into a course
 * was signed out mid-lesson on the sixth day no matter how much they had used
 * the site in between, which is the worst possible moment to lose somebody:
 * they are in the middle of something they came here to finish.
 *
 * Firebase reissues the ID token roughly hourly and `onIdTokenChanged` fires
 * when it does. That is the signal, not the schedule.
 *
 * The schedule is deliberately much slower than the signal. Renewing on every
 * token change would mean an hourly request per open tab per learner, and
 * every one of them costs a Firebase Admin round trip on the server. Once a
 * day is enough to keep a five day window from ever closing under an active
 * user, so a timestamp in localStorage throttles it. If localStorage is
 * unavailable, in a private window or with site data blocked, the refresh
 * simply runs on that page load rather than failing.
 *
 * Failures back off too, which matters more than the success interval. See
 * AFTER_FAILURE_MS below.
 */

/**
 * When this browser may next try. Not "when it last succeeded", which is the
 * shape this started as and which had no way to record a failure.
 */
const NEXT_ATTEMPT_KEY = "gn_session_next_refresh";

/** A success buys a full day. Nothing needs renewing more often than that. */
const AFTER_SUCCESS_MS = 24 * 60 * 60 * 1000;

/**
 * A failure backs off rather than retrying on every page load, and this is the
 * whole reason the key changed shape.
 *
 * The refresh bucket is 60 an hour keyed on hashed client IP, and this
 * audience shares carrier NAT addresses in large numbers. With no backoff, one
 * exhausted bucket meant every browser behind that address retried on every
 * navigation, took a 429, recorded nothing, and tried again on the next page.
 * The bucket could never drain, so nobody behind it ever had their session
 * extended, and all of them were signed out on the fifth day: precisely the
 * failure this component exists to prevent, made worse by the fact that the
 * busier the address, the more certain it becomes.
 */
const AFTER_FAILURE_MS = 15 * 60 * 1000;

function nextAttemptAt(): number {
  try {
    const raw = window.localStorage.getItem(NEXT_ATTEMPT_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function scheduleNext(from: number, delay: number): void {
  try {
    window.localStorage.setItem(NEXT_ATTEMPT_KEY, String(from + delay));
  } catch {
    // Private window, or site data blocked. Without somewhere to write the
    // backoff this falls back to one attempt per page load, which the rate
    // limit still bounds.
  }
}

export function SessionKeepAlive() {
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onIdTokenChanged(firebaseAuth, async (user) => {
      if (!user || cancelled) return;

      const now = Date.now();
      if (now < nextAttemptAt()) return;

      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/session/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (cancelled) return;
        scheduleNext(now, res.ok ? AFTER_SUCCESS_MS : AFTER_FAILURE_MS);
      } catch {
        // Offline, or the request was cut off by a navigation. Back off the
        // same way a rejection does: the existing cookie is untouched, there
        // is nothing to tell the learner, and hammering a dead network helps
        // nobody.
        if (!cancelled) scheduleNext(now, AFTER_FAILURE_MS);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return null;
}
