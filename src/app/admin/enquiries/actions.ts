"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import type { AdminFormState } from "@/components/admin/admin-form";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  enquiryId: z.string().uuid(),
  status: z.enum(["handled", "spam"]),
});

export async function resolveEnquiryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse({
    enquiryId: formData.get("enquiryId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  try {
    // The status guard makes a double-click a no-op rather than a second
    // audit entry against a different admin's decision.
    const { data, error } = await supabaseAdmin()
      .from("employer_enquiries")
      .update({
        status: parsed.data.status,
        handled_at: new Date().toISOString(),
        handled_by: admin.uid,
      })
      .eq("id", parsed.data.enquiryId)
      .eq("status", "new")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: "That enquiry was already dealt with." };

    await auditLog({
      actorId: admin.uid,
      action: `enquiry.${parsed.data.status}`,
      entity: "employer_enquiry",
      entityId: parsed.data.enquiryId,
    });

    revalidatePath("/admin/enquiries");
    return { ok: `Marked ${parsed.data.status}.` };
  } catch (e) {
    console.error("resolve enquiry failed", e);
    return { error: "Couldn't update the enquiry." };
  }
}
