import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { z } from "zod";
import { getPostById } from "@/lib/db/posts";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField } from "@/components/admin/field";
import { Badge } from "@/components/ui/badge";
import { PostFields } from "../post-fields";
import { deletePostAction, savePostAction } from "../actions";

export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();

  const post = await getPostById(parsed.data).catch(() => null);
  if (!post) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/admin/posts"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Blog
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{post.title}</h1>
          <Badge
            variant={post.status === "published" ? "default" : "secondary"}
          >
            {post.status}
          </Badge>
          {post.status === "published" && (
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View post
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <AdminForm action={savePostAction}>
        <PostFields post={post} />
      </AdminForm>

      <div className="border-t border-border pt-6">
        <AdminForm
          action={deletePostAction}
          submitLabel="Delete this post"
          destructive
        >
          <input type="hidden" name="id" value={post.id} />
          <CheckboxField
            name="confirm"
            label={`Yes, delete "${post.title}"`}
            hint="Anyone holding the link gets a 404 afterwards. Unpublishing keeps it recoverable."
          />
        </AdminForm>
      </div>
    </div>
  );
}
