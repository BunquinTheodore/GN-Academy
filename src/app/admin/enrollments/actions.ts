"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { setEnrollmentStatus } from "@/lib/db/enrollments";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  enrollmentId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export async function decideEnrollmentAction(formData: FormData): Promise<void> {
  // Admin claim verified server-side — the layout gate is not enough for actions.
  const user = await getSessionUser();
  if (!user?.admin) throw new Error("Not authorised.");

  const parsed = schema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  const status = parsed.data.decision === "approve" ? "active" : "rejected";
  await setEnrollmentStatus(parsed.data.enrollmentId, status);

  await supabaseAdmin().from("audit_log").insert({
    actor_id: user.uid,
    action: `enrollment.${parsed.data.decision}d`,
    entity: "enrollment",
    entity_id: parsed.data.enrollmentId,
    metadata: { status },
  });

  revalidatePath("/admin/enrollments");
}
