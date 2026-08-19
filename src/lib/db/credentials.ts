import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { CompetencyResult } from "@/lib/assessment/scoring";

export type Credential = {
  id: string;
  credential_code: string;
  user_id: string | null;
  certification_id: string | null;
  holder_name: string;
  title: string;
  level: string | null;
  issued_at: string;
  expires_at: string | null;
  status: "active" | "revoked" | "expired";
  competencies: { key: string; label: string; score: number }[] | null;
  pdf_url: string | null;
  revoked_reason: string | null;
  revoked_at: string | null;
};

export async function getCredentialByCode(
  code: string,
): Promise<Credential | null> {
  const { data, error } = await supabaseAdmin()
    .from("credentials")
    .select("*")
    .eq("credential_code", code.toUpperCase().trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCredentialsForUser(
  userId: string,
): Promise<Credential[]> {
  const { data, error } = await supabaseAdmin()
    .from("credentials")
    .select("*")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCredentialForUserAndCertification(
  userId: string,
  certificationId: string,
): Promise<Credential | null> {
  const { data, error } = await supabaseAdmin()
    .from("credentials")
    .select("*")
    .eq("user_id", userId)
    .eq("certification_id", certificationId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Issue a credential with an atomic {PREFIX}-{YEAR}-{SEQ} code (§7: sequence
 * behind a row lock, never count(*)+1) and write the audit_log entry.
 */
export async function issueCredential(input: {
  user_id: string;
  certification_id: string;
  credential_prefix: string;
  holder_name: string;
  title: string;
  level: string;
  competencies: CompetencyResult[];
}): Promise<Credential> {
  const admin = supabaseAdmin();

  const { data: code, error: codeError } = await admin.rpc(
    "next_credential_code",
    { p_prefix: input.credential_prefix },
  );
  if (codeError) throw codeError;

  const { data, error } = await admin
    .from("credentials")
    .insert({
      credential_code: code,
      user_id: input.user_id,
      certification_id: input.certification_id,
      holder_name: input.holder_name,
      title: input.title,
      level: input.level,
      competencies: input.competencies.map((c) => ({
        key: c.key,
        label: c.label,
        score: c.score,
      })),
    })
    .select("*")
    .single();
  if (error) throw error;

  await admin.from("audit_log").insert({
    actor_id: input.user_id,
    action: "credential.issued",
    entity: "credential",
    entity_id: data.id,
    metadata: { credential_code: code, certification_id: input.certification_id },
  });

  return data;
}
