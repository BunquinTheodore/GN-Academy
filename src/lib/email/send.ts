import "server-only";

import { Resend } from "resend";
import type { ReactElement } from "react";
import { serverEnv } from "@/lib/env.server";

/**
 * Best-effort transactional sender (Resend free: 100/day, 3,000/month —
 * transactional only, §4). Failures are logged, never thrown: a down email
 * provider must not block someone's test results.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<boolean> {
  if (serverEnv.RESEND_API_KEY.startsWith("PLACEHOLDER")) {
    console.warn(`[email] skipped (placeholder key): "${input.subject}"`);
    return false;
  }
  try {
    const resend = new Resend(serverEnv.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      // Resend's sandbox sender only delivers to the account owner, so this
      // has to move to a verified domain before the first real cohort. It is
      // an env var rather than an edit here so that DNS verification is the
      // only thing standing between now and working email.
      from: process.env.RESEND_FROM || "GN Academy <onboarding@resend.dev>",
      to: input.to,
      subject: input.subject,
      react: input.react,
    });
    if (error) {
      console.error("[email] send failed", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
