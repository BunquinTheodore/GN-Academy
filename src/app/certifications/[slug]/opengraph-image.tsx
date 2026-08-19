import { ImageResponse } from "next/og";
import { getPublishedCertificationBySlug } from "@/lib/db/certifications";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GN Academy certification";

const LEVEL_LABEL: Record<string, string> = {
  foundation: "Foundation certification",
  professional: "Professional certification",
  advanced: "Advanced certification",
};

/**
 * The shared card is a credential, not a course thumbnail — ink field, gold
 * verification accent, the same visual language as the card on the site, so
 * a link posted to Facebook or LinkedIn already looks like proof.
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cert = await getPublishedCertificationBySlug(slug).catch(() => null);

  const title = cert?.title ?? "GN Academy certification";
  const level = cert ? (LEVEL_LABEL[cert.level] ?? "Certification") : "";
  const price = cert?.is_free
    ? "Free"
    : cert?.price_php
      ? `PHP ${cert.price_php.toLocaleString("en-PH")}`
      : "";

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
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ color: "#8FA3BF", fontSize: 26, letterSpacing: 5 }}>
            GN ACADEMY
          </div>
          <div
            style={{
              background: "#C08A2E",
              borderRadius: 999,
              color: "#101B2E",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "10px 28px",
            }}
          >
            VERIFIABLE CREDENTIAL
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ color: "#8FA3BF", fontSize: 30, letterSpacing: 3 }}>
            {level.toUpperCase()}
          </div>
          <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.1 }}>
            {title}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            borderTop: "2px solid #2A3854",
            color: "#8FA3BF",
            display: "flex",
            fontSize: 30,
            justifyContent: "space-between",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex" }}>
            Scored exam · public verification page
          </div>
          <div style={{ color: "#F5F7FA", display: "flex", fontWeight: 700 }}>
            {price}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
