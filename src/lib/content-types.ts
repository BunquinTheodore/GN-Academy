// Shared between server-only data access (src/lib/db/posts.ts) and client
// components (e.g. the admin post form) — must stay free of "server-only".

export type ContentType = "blog" | "short_guide";

/** The public URL section a post of this content type lives under. */
export function contentSection(contentType: ContentType): "blog" | "short-guides" {
  return contentType === "short_guide" ? "short-guides" : "blog";
}

/** The public URL for a post — `/blog/{slug}` or `/short-guides/{slug}`. */
export function contentPath(post: { slug: string; content_type: ContentType }): string {
  return `/${contentSection(post.content_type)}/${post.slug}`;
}

/** Fixed taxonomy for short guides — bitskwela-style category pills. */
export const SHORT_GUIDE_CATEGORIES = [
  "Cryptocurrency (Crypto)",
  "Blockchain",
  "Non-Fungible Tokens (NFTs)",
  "Wallets",
  "Polkadot",
  "GameFi",
  "SocialFi",
  "DeFi and DApps",
  "RWA",
  "Metaverse",
] as const;
