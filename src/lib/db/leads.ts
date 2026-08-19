import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function createLead(input: {
  email: string;
  source: string;
  anon_id?: string | null;
  attempt_id?: string | null;
  career_path?: string | null;
  marketing_consent: boolean;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("leads").insert({
    email: input.email,
    source: input.source,
    anon_id: input.anon_id ?? null,
    attempt_id: input.attempt_id ?? null,
    career_path: input.career_path ?? null,
    marketing_consent: input.marketing_consent,
  });
  if (error) throw error;
}

// ── Admin (service role; callers must have re-checked the admin claim) ──────

export type Lead = {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  source: string;
  career_path: string | null;
  anon_id: string | null;
  attempt_id: string | null;
  marketing_consent: boolean;
  created_at: string;
};

export async function listLeads(limit = 200): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countLeads(): Promise<{ total: number; consented: number }> {
  const admin = supabaseAdmin();
  const [{ count: total }, { count: consented }] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("marketing_consent", true),
  ]);
  return { total: total ?? 0, consented: consented ?? 0 };
}

/** Every lead, oldest first — the export, not the screen. */
export async function listAllLeadsForExport(): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
