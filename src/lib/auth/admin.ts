import "server-only";

import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * The admin gate for server actions and route handlers. The /admin layout
 * already 404s non-admins, but a layout is not a security boundary for
 * actions — every mutation re-checks the custom claim itself (§6.6).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user?.admin) throw new Error("Not authorised.");
  return user;
}

/**
 * Append-only trail for every admin mutation. Never throws: a failed audit
 * write must not roll back a change the admin already saw succeed — it is
 * logged loudly instead so the gap is visible in the server logs.
 */
export async function auditLog(input: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin().from("audit_log").insert({
      actor_id: input.actorId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) throw error;
  } catch (e) {
    console.error(`[audit] failed to record ${input.action}`, e);
  }
}
