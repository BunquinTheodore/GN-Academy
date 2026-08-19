import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_mdx: string | null;
  category: string;
  cover_image_url: string | null;
  author_name: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PostSummary = Omit<Post, "content_mdx">;

const SUMMARY_COLUMNS =
  "id, slug, title, excerpt, category, cover_image_url, author_name, status, published_at, created_at, updated_at";

export async function listPublishedPosts(
  category?: string,
): Promise<PostSummary[]> {
  let builder = supabaseAdmin()
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (category) builder = builder.eq("category", category);

  const { data, error } = await builder;
  if (error) throw error;
  return data ?? [];
}

/** Categories that actually have published posts — no empty filter chips. */
export async function listPostCategories(): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select("category")
    .eq("status", "published");
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.category))].sort();
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<Post | null> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Admin (service role; callers must have re-checked the admin claim) ──────

export async function listAllPosts(): Promise<PostSummary[]> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type PostInput = {
  slug: string;
  title: string;
  excerpt: string | null;
  content_mdx: string | null;
  category: string;
  cover_image_url: string | null;
  author_name: string;
  status: "draft" | "published";
  published_at: string | null;
};

export async function createPost(input: PostInput): Promise<Post> {
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePost(id: string, input: PostInput): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("posts")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("posts").delete().eq("id", id);
  if (error) throw error;
}
