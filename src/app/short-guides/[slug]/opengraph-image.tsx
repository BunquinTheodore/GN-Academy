import { ImageResponse } from "next/og";
import { getPublishedPostBySlug } from "@/lib/db/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GN Academy short guide";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getPublishedPostBySlug(slug, "short_guide").catch(
    () => null,
  );

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
        <div style={{ color: "#C8F048", display: "flex", fontSize: 26, letterSpacing: 5 }}>
          GN ACADEMY · SHORT GUIDE
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}>
          {guide?.title ?? "GN Academy Short Guides"}
        </div>
        <div
          style={{
            borderTop: "2px solid #2A3854",
            color: "#AEBBD0",
            display: "flex",
            fontSize: 28,
            paddingTop: 28,
          }}
        >
          {guide?.category ?? "Practical learning in one sitting"}
        </div>
      </div>
    ),
    size,
  );
}
