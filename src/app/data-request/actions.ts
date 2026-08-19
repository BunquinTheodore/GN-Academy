"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createDataRequest } from "@/lib/db/data-requests";
import { checkRateLimit, hashIp, RATE_LIMITS } from "@/lib/rate-limit";

export type DataRequestState = { error: string } | { ok: string } | null;

const schema = z.object({
  email: z.string().trim().email("Enter the email address on your account."),
  kind: z.enum(["access", "correction", "deletion"]),
  details: z.string().trim().max(2000).nullable(),
});

export async function submitDataRequestAction(
  _prev: DataRequestState,
  formData: FormData,
): Promise<DataRequestState> {
  const headerList = await headers();
  // Server actions have no Request object; rebuild the shape the limiter reads.
  const request = new Request("https://gnacademy.internal/data-request", {
    headers: headerList,
  });

  if (!(await checkRateLimit(request, RATE_LIMITS.emailCapture))) {
    return {
      error: "Too many requests from this connection. Try again in an hour.",
    };
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    kind: formData.get("kind"),
    details: String(formData.get("details") ?? "").trim() || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  // A signed-in requester is matched to their account; a signed-out one is
  // matched by email at review time. Either way the admin verifies identity
  // before acting — this form is a queue, not an authorisation.
  const user = await getSessionUser();

  try {
    await createDataRequest({
      user_id: user?.uid ?? null,
      email: parsed.data.email.toLowerCase(),
      kind: parsed.data.kind,
      details: parsed.data.details,
      ip_hash: hashIp(
        headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
          headerList.get("x-real-ip") ??
          "unknown",
      ),
    });
  } catch (e) {
    console.error("data request failed", e);
    return {
      error:
        "Couldn't record the request. Email gnclub.contactus@gmail.com instead and we'll handle it manually.",
    };
  }

  return {
    ok: "Request received. We reply within 15 working days, as the Data Privacy Act requires, to the email address you gave.",
  };
}
