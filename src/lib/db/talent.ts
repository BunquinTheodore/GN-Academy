import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { Profile } from "@/lib/db/profiles";

export type PortfolioItem = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  project_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TalentCredential = {
  credential_code: string;
  title: string;
  level: string | null;
  issued_at: string;
};

export type TalentProfile = {
  profile: Profile;
  credentials: TalentCredential[];
  portfolio: PortfolioItem[];
};

/**
 * A profile is public only when its owner opted in AND holds at least one
 * active credential. Both halves matter: the opt-in is consent, and the
 * credential is what the directory is for — an unverified profile here would
 * be exactly the unbacked claim the product exists to replace (§9).
 */
export async function getPublicTalentByUsername(
  username: string,
): Promise<TalentProfile | null> {
  const admin = supabaseAdmin();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const [{ data: credentials }, { data: portfolio }] = await Promise.all([
    admin
      .from("credentials")
      .select("credential_code, title, level, issued_at")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("issued_at", { ascending: false }),
    admin
      .from("portfolio_items")
      .select("*")
      .eq("user_id", profile.id)
      .order("sort_order"),
  ]);

  if (!credentials || credentials.length === 0) return null;

  return {
    profile,
    credentials,
    portfolio: portfolio ?? [],
  };
}

export type TalentSummary = {
  username: string;
  full_name: string | null;
  headline: string | null;
  location: string;
  skills: string[];
  avatar_url: string | null;
  credentials: { title: string; level: string | null }[];
};

/**
 * The employer directory. Everyone listed here holds an active credential —
 * there is no "unverified" tier to filter out, by design.
 */
export async function listPublicTalent(filters?: {
  skill?: string;
  certification?: string;
}): Promise<TalentSummary[]> {
  const admin = supabaseAdmin();

  let query = admin
    .from("profiles")
    .select("id, username, full_name, headline, location, skills, avatar_url")
    .eq("is_public", true)
    .not("username", "is", null);

  if (filters?.skill) {
    // contains: the row's skills array must include this one.
    query = query.contains("skills", [filters.skill]);
  }

  const { data: profiles, error } = await query.order("updated_at", {
    ascending: false,
  });
  if (error) throw error;
  if (!profiles || profiles.length === 0) return [];

  const { data: credentials, error: credentialError } = await admin
    .from("credentials")
    .select("user_id, title, level")
    .eq("status", "active")
    .in(
      "user_id",
      profiles.map((p) => p.id),
    );
  if (credentialError) throw credentialError;

  const byUser = new Map<string, { title: string; level: string | null }[]>();
  for (const c of credentials ?? []) {
    if (!c.user_id) continue;
    const list = byUser.get(c.user_id) ?? [];
    list.push({ title: c.title, level: c.level });
    byUser.set(c.user_id, list);
  }

  return profiles
    .map((p) => ({
      username: p.username as string,
      full_name: p.full_name,
      headline: p.headline,
      location: p.location,
      skills: p.skills ?? [],
      avatar_url: p.avatar_url,
      credentials: byUser.get(p.id) ?? [],
    }))
    .filter((t) => t.credentials.length > 0)
    .filter(
      (t) =>
        !filters?.certification ||
        t.credentials.some((c) => c.title === filters.certification),
    );
}

/** Distinct facets across listed talent — never shows a filter that matches nobody. */
export async function getTalentFacets(): Promise<{
  skills: string[];
  certifications: string[];
}> {
  const talent = await listPublicTalent();
  const skills = new Set<string>();
  const certifications = new Set<string>();
  for (const t of talent) {
    t.skills.forEach((s) => skills.add(s));
    t.credentials.forEach((c) => certifications.add(c.title));
  }
  return {
    skills: [...skills].sort(),
    certifications: [...certifications].sort(),
  };
}

// ── Owner-side ──────────────────────────────────────────────────────────────

export async function listPortfolioForUser(
  userId: string,
): Promise<PortfolioItem[]> {
  const { data, error } = await supabaseAdmin()
    .from("portfolio_items")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getPortfolioItem(
  id: string,
): Promise<PortfolioItem | null> {
  const { data, error } = await supabaseAdmin()
    .from("portfolio_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type PortfolioInput = {
  title: string;
  description: string | null;
  image_path: string | null;
  project_url: string | null;
  sort_order: number;
};

export async function createPortfolioItem(
  userId: string,
  input: PortfolioInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("portfolio_items")
    .insert({ user_id: userId, ...input });
  if (error) throw error;
}

/** Scoped to the owner in the query itself, not just in the caller's check. */
export async function updatePortfolioItem(
  id: string,
  userId: string,
  input: PortfolioInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("portfolio_items")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deletePortfolioItem(
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export type ProfileInput = {
  full_name: string | null;
  username: string | null;
  headline: string | null;
  bio: string | null;
  location: string;
  situation: Profile["situation"];
  skills: string[];
  is_public: boolean;
  avatar_url: string | null;
};

export async function updateOwnProfile(
  userId: string,
  input: ProfileInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update(input)
    .eq("id", userId);
  if (error) throw error;
}

/** Case-insensitive, excluding the caller — the check the DB index enforces. */
export async function isUsernameTaken(
  username: string,
  excludeUserId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", excludeUserId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function countActiveCredentials(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}
