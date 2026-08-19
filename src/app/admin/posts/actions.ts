"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import { optional } from "@/lib/admin/form-values";
import type { AdminFormState } from "@/components/admin/admin-form";
import {
  createPost,
  deletePost,
  getPostById,
  updatePost,
  type PostInput,
} from "@/lib/db/posts";

function revalidateBlog(slug?: string): void {
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

const postSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase words separated by hyphens.",
    ),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(400).nullable(),
  content_mdx: z.string().max(80_000).nullable(),
  category: z.string().trim().min(2).max(60),
  cover_image_url: z.string().trim().url().max(500).nullable(),
  author_name: z.string().trim().min(2).max(120),
  status: z.enum(["draft", "published"]),
});

export async function savePostAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = postSchema.safeParse({
    id: optional(formData.get("id")) ?? undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    excerpt: optional(formData.get("excerpt")),
    content_mdx: optional(formData.get("content_mdx")),
    category: formData.get("category"),
    cover_image_url: optional(formData.get("cover_image_url")),
    author_name: optional(formData.get("author_name")) ?? "GN Academy",
    status: formData.get("status"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "form"}: ${issue.message}` };
  }

  const { id, ...rest } = parsed.data;

  try {
    // published_at is set once, the first time a post goes live — republishing
    // an edited post must not move it to the top of the feed.
    const existing = id ? await getPostById(id) : null;
    const publishedAt =
      rest.status === "published"
        ? (existing?.published_at ?? new Date().toISOString())
        : (existing?.published_at ?? null);

    const input: PostInput = { ...rest, published_at: publishedAt };

    if (id) {
      await updatePost(id, input);
      await auditLog({
        actorId: admin.uid,
        action: "post.updated",
        entity: "post",
        entityId: id,
        metadata: { slug: input.slug, status: input.status },
      });
      revalidateBlog(input.slug);
      if (existing && existing.slug !== input.slug) {
        revalidateBlog(existing.slug);
      }
      revalidatePath(`/admin/posts/${id}`);
      return { ok: "Saved." };
    }

    const created = await createPost(input);
    await auditLog({
      actorId: admin.uid,
      action: "post.created",
      entity: "post",
      entityId: created.id,
      metadata: { slug: input.slug, status: input.status },
    });
    revalidateBlog(input.slug);
    redirect(`/admin/posts/${created.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("save post failed", e);
    const message = e instanceof Error ? e.message : "";
    if (message.includes("duplicate key")) {
      return { error: "Another post already uses that slug." };
    }
    return { error: "Couldn't save the post." };
  }
}

export async function deletePostAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid request." };
  if (formData.get("confirm") !== "on") {
    return { error: "Tick the confirmation box to delete this post." };
  }

  try {
    const existing = await getPostById(id.data);
    await deletePost(id.data);
    await auditLog({
      actorId: admin.uid,
      action: "post.deleted",
      entity: "post",
      entityId: id.data,
      metadata: { slug: existing?.slug ?? null },
    });
    revalidateBlog(existing?.slug);
  } catch (e) {
    console.error("delete post failed", e);
    return { error: "Couldn't delete the post." };
  }

  redirect("/admin/posts");
}
