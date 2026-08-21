"use server";

import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import { setEnrollmentStatus } from "@/lib/db/enrollments";
import { sendEmail } from "@/lib/email/send";
import { EnrollmentApprovedEmail } from "@/lib/email/enrollment-approved";
import { env } from "@/lib/env";

const schema = z.object({
  enrollmentId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export async function decideEnrollmentAction(formData: FormData): Promise<void> {
  // Admin claim verified server-side — the layout gate is not enough for actions.
  const user = await requireAdmin();

  const parsed = schema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  const status = parsed.data.decision === "approve" ? "active" : "rejected";
  const enrollment = await setEnrollmentStatus(parsed.data.enrollmentId, status);

  // Null means someone else already decided this one — nothing to log or send.
  if (!enrollment) {
    return;
  }

  await auditLog({
    actorId: user.uid,
    action: `enrollment.${parsed.data.decision}d`,
    entity: "enrollment",
    entityId: parsed.data.enrollmentId,
    metadata: { status },
  });

  if (status === "active" && enrollment.profiles?.email) {
    // Best-effort: sendEmail never throws, and a mail failure must not
    // un-approve a payment the admin has already matched.
    await sendEmail({
      to: enrollment.profiles.email,
      subject: `Payment confirmed: ${enrollment.certifications?.title ?? "your course"} is open`,
      react: EnrollmentApprovedEmail({
        studentName:
          enrollment.profiles.full_name?.trim() ||
          enrollment.profiles.email.split("@")[0],
        title: enrollment.certifications?.title ?? "Your certification",
        courseUrl: `${env.NEXT_PUBLIC_SITE_URL}/dashboard/courses`,
      }),
    });
  }

}
