import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/field";
import type { Post } from "@/lib/db/posts";

export function PostFields({ post }: { post?: Post }) {
  return (
    <>
      {post && <input type="hidden" name="id" value={post.id} />}

      <TextField
        name="title"
        label="Title"
        required
        defaultValue={post?.title}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="slug"
          label="URL slug"
          required
          defaultValue={post?.slug}
          placeholder="what-employers-actually-check"
          hint="Changing it after publishing breaks existing links."
        />
        <TextField
          name="category"
          label="Category"
          required
          defaultValue={post?.category ?? "General"}
          hint="Becomes a filter on the blog index."
        />
      </div>

      <TextAreaField
        name="excerpt"
        label="Excerpt"
        rows={3}
        defaultValue={post?.excerpt}
        hint="Shown on the index card, in search results, and when the link is shared."
      />

      <TextAreaField
        name="content_mdx"
        label="Body (Markdown)"
        rows={20}
        defaultValue={post?.content_mdx}
        hint="## subheading, - bullets, **bold**, [links](https://…)."
        className="font-mono"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="author_name"
          label="Author"
          defaultValue={post?.author_name ?? "GN Academy"}
        />
        <TextField
          name="cover_image_url"
          label="Cover image URL"
          type="url"
          defaultValue={post?.cover_image_url}
          hint="Optional."
        />
      </div>

      <SelectField
        name="status"
        label="Status"
        defaultValue={post?.status ?? "draft"}
        options={[
          { value: "draft", label: "Draft — invisible on the site" },
          { value: "published", label: "Published — live on /blog" },
        ]}
      />
    </>
  );
}
