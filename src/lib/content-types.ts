// Shared between server-only data access (src/lib/db/posts.ts) and client
// components (e.g. the admin post form) — must stay free of "server-only".

export type ContentType = "blog";

/** The public URL section a post of this content type lives under. */
export function contentSection(contentType: ContentType): "blog" {
  return contentType;
}

/** The public URL for a post — `/blog/{slug}`. */
export function contentPath(post: { slug: string; content_type: ContentType }): string {
  return `/${contentSection(post.content_type)}/${post.slug}`;
}
