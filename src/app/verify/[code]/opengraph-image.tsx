import { ImageResponse } from "next/og";
import { getCredentialByCode } from "@/lib/db/credentials";
import { formatDate } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Verified GN Academy credential";

/**
 * The card LinkedIn draws under the link in a shared certificate post. It shows
 * who earned what and when, in the same ink and gold as the credential card,
 * because the learner is posting it as proof and a generic site banner would
 * read as an advert. A code that matches nothing, or a revoked credential,
 * gets a neutral card that claims nothing.
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const credential = await getCredentialByCode(code).catch(() => null);
  const active = credential?.status === "active";

  const heading = active ? credential.title : "GN Academy credential";
  const holder = active ? credential.holder_name : "";
  const footerLeft = active
    ? `Issued ${formatDate(credential.issued_at)}`
    : "Public verification page";
  const footerRight = active ? credential.credential_code : "";

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
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "10px 28px",
            }}
          >
            {active ? "VERIFIED CREDENTIAL" : "CREDENTIAL"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {holder && (
            <div style={{ color: "#8FA3BF", display: "flex", fontSize: 34 }}>
              {holder}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {heading}
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
          <div style={{ display: "flex" }}>{footerLeft}</div>
          <div
            style={{
              color: "#F5F7FA",
              display: "flex",
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            {footerRight}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
