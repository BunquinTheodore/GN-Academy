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
      // TODO(blocked): switch to the verified domain sender once DNS
      // verification is done — see BLOCKED.md.
      from: "GN Academy <onboarding@resend.dev>",
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
