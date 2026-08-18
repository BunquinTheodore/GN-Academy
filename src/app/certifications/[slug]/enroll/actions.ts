"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getPublishedCertificationBySlug } from "@/lib/db/certifications";
import { createEnrollment, getEnrollment } from "@/lib/db/enrollments";
import { supabaseAdmin } from "@/lib/supabase/server";

const enrollSchema = z.object({
  slug: z.string().min(1).max(100),
  paymentMethod: z.enum(["gcash", "maya"]).optional(),
  paymentRef: z.string().trim().min(6, "Enter the reference number from your receipt.").max(64).optional(),
});

export type EnrollState = { error: string } | null;

export async function enrollAction(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/certifications");

  const parsed = enrollSchema.safeParse({
    slug: formData.get("slug"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    paymentRef: formData.get("paymentRef") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const cert = await getPublishedCertificationBySlug(parsed.data.slug).catch(
    () => null,
  );
  if (!cert) return { error: "This certification no longer exists." };

  const existing = await getEnrollment(user.uid, cert.id).catch(() => null);
  if (existing && existing.status !== "rejected") {
    redirect("/dashboard/courses");
  }

  if (!cert.is_free) {
    if (!parsed.data.paymentMethod || !parsed.data.paymentRef) {
      return {
        error: "Choose a payment method and enter your payment reference number.",
      };
    }
  }

  try {
    const enrollment = await createEnrollment({
      user_id: user.uid,
      certification_id: cert.id,
      is_free: cert.is_free,
      payment_method: parsed.data.paymentMethod,
      payment_ref: parsed.data.paymentRef,
      amount_paid_php: cert.is_free ? 0 : (cert.price_php ?? undefined),
    });

    await supabaseAdmin().from("audit_log").insert({
      actor_id: user.uid,
      action: "enrollment.created",
      entity: "enrollment",
      entity_id: enrollment.id,
      metadata: { certification_id: cert.id, status: enrollment.status },
    });
  } catch (e) {
    console.error("enrollment failed", e);
    return { error: "Enrollment couldn't be saved. Try again." };
  }

  redirect("/dashboard/courses");
}
