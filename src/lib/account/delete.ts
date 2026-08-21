import "server-only";

import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AVATAR_BUCKET, PORTFOLIO_BUCKET } from "@/lib/storage";

export type DeletionReport = {
  profileDeleted: boolean;
  attemptsDeleted: number;
  leadsDeleted: number;
  credentialsUnlinked: number;
  filesDeleted: number;
  firebaseUserDeleted: boolean;
};

/**
 * Both buckets are public-read, and every object a person uploads lives in a
 * folder named after their UID. Deleting the rows that point at those files
 * is not erasure while the files themselves stay at a stable public URL, so
 * the folders go too.
 */
async function deleteOwnedObjects(userId: string): Promise<number> {
  const storage = supabaseAdmin().storage;
  let removed = 0;

  for (const bucket of [AVATAR_BUCKET, PORTFOLIO_BUCKET]) {
    const { data: files, error } = await storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (error) throw error;
    if (!files || files.length === 0) continue;

    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await storage.from(bucket).remove(paths);
    if (removeError) throw removeError;
    removed += paths.length;
  }

  return removed;
}

/**
 * RA 10173 erasure (§14). Removes the person's account and everything
 * attributable to them, with two deliberate exceptions:
 *
 *  - Credentials are RETAINED but unlinked (user_id → null). A credential is
 *    a public statement GN Academy made about a competency at a point in
 *    time; employers who checked a code must keep getting an answer. The row
 *    keeps the holder name that appears on the certificate itself and loses
 *    the link to the account.
 *  - audit_log entries stay. They record what staff did, not what the
 *    subject did, and are the evidence that this deletion happened at all.
 *
 * Everything else goes, including the avatar and portfolio images in storage.
 *
 * Order matters: the Firebase user goes last, so a failure part-way through
 * leaves an account that can still sign in and ask again, rather than an
 * orphaned pile of rows nobody can reach.
 */
export async function deleteAccountData(input: {
  userId: string;
  email: string;
}): Promise<DeletionReport> {
  const admin = supabaseAdmin();
  const report: DeletionReport = {
    profileDeleted: false,
    attemptsDeleted: 0,
    leadsDeleted: 0,
    credentialsUnlinked: 0,
    filesDeleted: 0,
    firebaseUserDeleted: false,
  };

  // Before the profile row goes: portfolio_items cascade with it, and once
  // they are gone nothing records which files belonged to this person.
  report.filesDeleted = await deleteOwnedObjects(input.userId);

  // Unlink first: the profile delete would do it via ON DELETE SET NULL, but
  // doing it explicitly means the count is reportable and the intent is in
  // the code rather than only in the schema.
  const { data: unlinked, error: unlinkError } = await admin
    .from("credentials")
    .update({ user_id: null })
    .eq("user_id", input.userId)
    .select("id");
  if (unlinkError) throw unlinkError;
  report.credentialsUnlinked = unlinked?.length ?? 0;

  // attempts.user_id is a plain text column (Firebase UIDs), not a foreign
  // key, so nothing cascades — it has to be deleted by hand.
  const { data: attempts, error: attemptError } = await admin
    .from("attempts")
    .delete()
    .eq("user_id", input.userId)
    .select("id");
  if (attemptError) throw attemptError;
  report.attemptsDeleted = attempts?.length ?? 0;

  const { data: leads, error: leadError } = await admin
    .from("leads")
    .delete()
    .eq("email", input.email)
    .select("id");
  if (leadError) throw leadError;
  report.leadsDeleted = leads?.length ?? 0;

  // Cascades to enrollments and lesson_progress.
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", input.userId)
    .select("id");
  if (profileError) throw profileError;
  report.profileDeleted = (profiles?.length ?? 0) > 0;

  try {
    await adminAuth().deleteUser(input.userId);
    report.firebaseUserDeleted = true;
  } catch (e) {
    // Already gone is a success, not a failure.
    const code = (e as { code?: string }).code;
    if (code === "auth/user-not-found") {
      report.firebaseUserDeleted = true;
    } else {
      throw e;
    }
  }

  return report;
}
