"use client";

import { useState } from "react";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/field";
import { AdminMediaUpload } from "@/components/admin/admin-media-upload";
import { SHORT_GUIDE_CATEGORIES, type ContentType } from "@/lib/content-types";
import type { Post } from "@/lib/db/posts";

export function PostFields({ post }: { post?: Post }) {
  const [contentType, setContentType] = useState<ContentType>(
    post?.content_type ?? "blog",
  );
  // Lifted out of the two category field variants below so a value typed or
  // chosen before toggling Content type isn't lost when the field swaps.
  const [category, setCategory] = useState(post?.category ?? "General");
  const isShortGuide = contentType === "short_guide";
  const isKnownShortGuideCategory = (
    SHORT_GUIDE_CATEGORIES as readonly string[]
  ).includes(category);
  const shortGuideCategoryOptions = isKnownShortGuideCategory
    ? SHORT_GUIDE_CATEGORIES.map((c) => ({ value: c, label: c }))
    : [
        { value: category, label: `${category} (legacy — choose another to replace it)` },
        ...SHORT_GUIDE_CATEGORIES.map((c) => ({ value: c, label: c })),
      ];

  return (
    <>
      {post && <input type="hidden" name="id" value={post.id} />}

      <TextField
        name="title"
        label="Title"
        required
        defaultValue={post?.title}
      />

      <SelectField
        name="content_type"
        label="Content type"
        defaultValue={contentType}
        options={[
          { value: "blog", label: "Blog post" },
          { value: "short_guide", label: "Short guide" },
        ]}
        hint="Controls whether this appears under /blog or /short-guides."
        onChange={(event) =>
          setContentType(event.target.value as ContentType)
        }
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
        {isShortGuide ? (
          <SelectField
            name="category"
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            options={shortGuideCategoryOptions}
            hint="Becomes a filter pill on the Short Guides page."
          />
        ) : (
          <TextField
            name="category"
            label="Category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            hint="Becomes a filter on the blog index."
          />
        )}
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

      <AdminMediaUpload
        label="Article screenshot helper"
        markdownHelper
      />

      <TextAreaField
        name="disclosure"
        label="Disclosure (optional)"
        rows={3}
        defaultValue={post?.disclosure}
        hint="Shown as an info banner on the guide's page — e.g. an independent-guide / no-affiliation notice."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="author_name"
          label="Author"
          defaultValue={post?.author_name ?? "GN Academy"}
        />
        <AdminMediaUpload
          name="cover_image_url"
          label="Cover image"
          defaultUrl={post?.cover_image_url}
        />
      </div>

      <SelectField
        name="status"
        label="Status"
        defaultValue={post?.status ?? "draft"}
        options={[
          { value: "draft", label: "Draft (invisible on the site)" },
          {
            value: "published",
            label: "Published (live on its public section)",
          },
        ]}
      />
    </>
  );
}
