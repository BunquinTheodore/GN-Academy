import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form";
import { PostFields } from "../post-fields";
import { savePostAction } from "../actions";

export const metadata: Metadata = {
  title: "New post",
  robots: { index: false, follow: false },
};

export default function NewPostPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/posts"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Blog
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">New post</h1>
      </div>

      <AdminForm action={savePostAction} submitLabel="Create">
        <PostFields />
      </AdminForm>
    </div>
  );
}
