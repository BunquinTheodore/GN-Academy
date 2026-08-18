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
