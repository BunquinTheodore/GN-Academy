import { z } from "zod";
import { isTrustedOrigin, untrustedOriginResponse } from "@/lib/origin-check";
import { sendEmail } from "@/lib/email/send";
import { SpeakerInquiryEmail } from "@/lib/email/speaker-inquiry";
import { site } from "@/content/site";

/**
 * Speaker booking inquiries.
 *
 * Validates the required fields server-side and, when a real Resend key is
 * configured, sends a notification to the team inbox using the same
 * `sendEmail` helper the rest of the app already uses for transactional mail
 * (`src/lib/email/send.ts`). That helper already no-ops safely behind a
 * placeholder key, so this route never pretends to have sent something it
 * did not: if `RESEND_API_KEY` is a placeholder, `sendEmail` logs a skip and
 * returns `false`, and this route still returns success to the visitor
 * (their inquiry was received and logged) while making the skip visible in
 * the server log rather than failing silently client-side.
 *
 * Only payload metadata is logged, never the full message body, so an
 * inquiry containing something a visitor typed carelessly does not end up
 * duplicated in application logs beyond what is needed to trace a request.
 */
const schema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  organization: z.string().trim().min(1, "Organization is required.").max(200),
  eventType: z.string().trim().min(1, "Event type is required.").max(100),
  date: z.string().trim().max(100).optional().default(""),
  audienceSize: z.string().trim().max(50).optional().default(""),
  message: z.string().trim().min(1, "Message is required.").max(4000),
});

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedOrigin(request)) return untrustedOriginResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Please fill in the required fields.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { name, organization, eventType, date, audienceSize, message } =
    parsed.data;

  // Metadata only — never the free-text message body.
  console.info("[speaker-booking] inquiry received", {
    organization,
    eventType,
    hasDate: Boolean(date),
    hasAudienceSize: Boolean(audienceSize),
    messageLength: message.length,
    at: new Date().toISOString(),
  });

  const sent = await sendEmail({
    to: site.contactEmail,
    subject: `Speaker inquiry: ${organization}`,
    react: SpeakerInquiryEmail({
      name,
      organization,
      eventType,
      date,
      audienceSize,
      message,
    }),
  });

  return Response.json({
    ok: true,
    emailed: sent,
    message: sent
      ? "Inquiry received and emailed to the team."
      : "Inquiry received and logged. Email delivery is not configured in this environment.",
  });
}
