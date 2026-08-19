"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import type { AdminFormState } from "@/components/admin/admin-form";
import { setCredentialStatus } from "@/lib/db/credentials";

const schema = z.object({
  credentialId: z.string().uuid(),
  decision: z.enum(["revoke", "reinstate"]),
  reason: z.string().trim().max(300).optional(),
});

/**
 * Revocation is a public act: the reason renders on /verify/[code] for
 * anyone who checks the code. It is never a delete — the record stays and
 * says "revoked", because a credential that silently disappears is worse
 * than one that is visibly withdrawn (§7).
 */
export async function decideCredentialAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse({
    credentialId: formData.get("credentialId"),
    decision: formData.get("decision"),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: "Invalid request." };

  const { credentialId, decision, reason } = parsed.data;

  if (decision === "revoke" && (!reason || reason.length < 10)) {
    return {
      error:
        "Give a reason of at least 10 characters — it is shown publicly on the verification page.",
    };
  }

  try {
    const credential = await setCredentialStatus(
      credentialId,
      decision === "revoke"
        ? { status: "revoked", reason: reason! }
        : { status: "active" },
    );
    if (!credential) return { error: "That credential no longer exists." };

    await auditLog({
      actorId: admin.uid,
      action: `credential.${decision}d`,
      entity: "credential",
      entityId: credentialId,
      metadata: {
        credential_code: credential.credential_code,
        ...(decision === "revoke" ? { reason } : {}),
      },
    });

    revalidatePath("/admin/credentials");
    revalidatePath(`/verify/${credential.credential_code}`);

    return {
      ok:
        decision === "revoke"
          ? `${credential.credential_code} is now shown as revoked on its verification page.`
          : `${credential.credential_code} is active again.`,
    };
  } catch (e) {
    console.error("credential decision failed", e);
    return { error: "Couldn't update the credential." };
  }
}
