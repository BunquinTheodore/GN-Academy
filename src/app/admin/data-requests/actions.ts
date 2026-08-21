"use server";

import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import { optional } from "@/lib/admin/form-values";
import type { AdminFormState } from "@/components/admin/admin-form";
import {
  getDataRequestById,
  resolveDataRequest,
} from "@/lib/db/data-requests";
import { deleteAccountData } from "@/lib/account/delete";
import { getProfileById } from "@/lib/db/profiles";
import { supabaseAdmin } from "@/lib/supabase/server";

const resolveSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["completed", "rejected"]),
  note: z.string().trim().max(500).nullable(),
});

/** Marks a request handled. Use this for access and correction requests. */
export async function resolveDataRequestAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = resolveSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    note: optional(formData.get("note")),
  });
  if (!parsed.success) return { error: "Invalid request." };

  try {
    const resolved = await resolveDataRequest(parsed.data.requestId, {
      status: parsed.data.status,
      note: parsed.data.note,
      resolvedBy: admin.uid,
    });
    if (!resolved) return { error: "That request was already resolved." };

    await auditLog({
      actorId: admin.uid,
      action: `data_request.${parsed.data.status}`,
      entity: "data_request",
      entityId: parsed.data.requestId,
      metadata: { kind: resolved.kind },
    });
    return { ok: `Marked ${parsed.data.status}.` };
  } catch (e) {
    console.error("resolve data request failed", e);
    return { error: "Couldn't update the request." };
  }
}

const deleteSchema = z.object({
  requestId: z.string().uuid(),
  confirmEmail: z.string().trim().email(),
});

/**
 * Executes an erasure request. Irreversible, so it demands the requester's
 * email typed back — the same guard a "type the repo name to delete" dialog
 * uses, and the only thing standing between a mis-click and a real person's
 * account.
 */
export async function executeDeletionAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = deleteSchema.safeParse({
    requestId: formData.get("requestId"),
    confirmEmail: formData.get("confirmEmail"),
  });
  if (!parsed.success) {
    return { error: "Type the requester's email address to confirm." };
  }

  const request = await getDataRequestById(parsed.data.requestId).catch(
    () => null,
  );
  if (!request) return { error: "That request no longer exists." };
  if (request.status !== "pending") {
    return { error: "That request was already resolved." };
  }
  if (request.kind !== "deletion") {
    return { error: "This is not a deletion request." };
  }
  if (
    request.email.toLowerCase() !== parsed.data.confirmEmail.toLowerCase()
  ) {
    return { error: "That email doesn't match the request." };
  }

  try {
    // The request may predate sign-in, or the address may differ from the
    // account's — resolve the account by email when there is no linked uid.
    let userId = request.user_id;
    if (!userId) {
      const { data } = await supabaseAdmin()
        .from("profiles")
        .select("id")
        .eq("email", request.email)
        .maybeSingle();
      userId = data?.id ?? null;
    }

    if (!userId) {
      // No account: still purge the lead rows that carry the address, then
      // close the request honestly rather than pretending an account existed.
      const { data: leads } = await supabaseAdmin()
        .from("leads")
        .delete()
        .eq("email", request.email)
        .select("id");

      await resolveDataRequest(parsed.data.requestId, {
        status: "completed",
        note: `No account found for this address. Deleted ${leads?.length ?? 0} lead record(s).`,
        resolvedBy: admin.uid,
      });
      await auditLog({
        actorId: admin.uid,
        action: "account.deleted",
        entity: "data_request",
        entityId: parsed.data.requestId,
        metadata: { account_found: false, leads: leads?.length ?? 0 },
      });
      return {
        ok: `No account matched that address. Removed ${leads?.length ?? 0} lead record(s).`,
      };
    }

    const profile = await getProfileById(userId);
    const report = await deleteAccountData({
      userId,
      email: profile?.email ?? request.email,
    });

    // Audit BEFORE closing the request: this entry is the record that the
    // erasure happened, and it survives the subject's data by design.
    await auditLog({
      actorId: admin.uid,
      action: "account.deleted",
      entity: "profile",
      entityId: userId,
      metadata: { account_found: true, ...report },
    });

    await resolveDataRequest(parsed.data.requestId, {
      status: "completed",
      note: `Account deleted. ${report.attemptsDeleted} attempt(s), ${report.leadsDeleted} lead(s) removed; ${report.credentialsUnlinked} credential(s) retained but unlinked.`,
      resolvedBy: admin.uid,
    });

    return {
      ok: `Deleted. ${report.credentialsUnlinked} credential(s) kept and unlinked, as the privacy page promises.`,
    };
  } catch (e) {
    console.error("account deletion failed", e);
    return {
      error:
        "Deletion failed part-way. The account can still sign in — check the server logs before retrying.",
    };
  }
}
