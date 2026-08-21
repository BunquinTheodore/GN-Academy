import "server-only";

import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  username: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string;
  career_path: string | null;
  situation: "student" | "employed" | "jobseeker" | "freelancer" | null;
  skills: string[];
  is_public: boolean;
  claims_synced: boolean;
  role: "student" | "admin" | "employer";
  marketing_consent: boolean;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Deduplicated per request with React's `cache`, for the same reason
 * `getSessionUser` is: the dashboard layout and the dashboard page both need
 * this, and every navigation inside the signed-in shell paid for it twice.
 */
export const getProfileById = cache(async function getProfileById(
  id: string,
): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
})

export async function upsertProfileOnSync(input: {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  marketing_consent?: boolean;
}): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .upsert(
      {
        id: input.id,
        email: input.email,
        full_name: input.full_name ?? undefined,
        avatar_url: input.avatar_url ?? undefined,
        ...(input.marketing_consent !== undefined && {
          marketing_consent: input.marketing_consent,
          consent_at: new Date().toISOString(),
        }),
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
  if (error) throw error;
}

export async function markClaimsSynced(id: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ claims_synced: true })
    .eq("id", id);
  if (error) throw error;
}
