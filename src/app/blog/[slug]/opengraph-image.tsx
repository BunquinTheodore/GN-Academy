import { ImageResponse } from "next/og";
import { getPublishedPostBySlug } from "@/lib/db/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GN Academy blog post";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug).catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#101B2E",
          color: "#F5F7FA",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: 72,
          width: "100%",
        }}
      >
        <div style={{ color: "#8FA3BF", display: "flex", fontSize: 26, letterSpacing: 5 }}>
          GN ACADEMY{post ? ` · ${post.category.toUpperCase()}` : ""}
        </div>

        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}>
          {post?.title ?? "GN Academy blog"}
        </div>

        <div
          style={{
            borderTop: "2px solid #2A3854",
            color: "#8FA3BF",
            display: "flex",
            fontSize: 28,
            paddingTop: 28,
          }}
        >
          {post?.author_name ?? "GN Academy"}
        </div>
      </div>
    ),
    size,
  );
}
