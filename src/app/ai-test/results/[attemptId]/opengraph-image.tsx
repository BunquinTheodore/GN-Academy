import { ImageResponse } from "next/og";
import { LEVELS, type LevelKey } from "@/content/ai-test";
import { getAttemptById } from "@/lib/db/attempts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI Readiness Test score";

export default async function OgImage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = /^[0-9a-f-]{36}$/i.test(attemptId)
    ? await getAttemptById(attemptId).catch(() => null)
    : null;

  const score = attempt?.score ?? null;
  const levelLabel =
    score !== null
      ? (LEVELS[(attempt?.level ?? "beginner") as LevelKey]?.label ?? "")
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#8FA3BF", fontSize: 28, letterSpacing: 4 }}>
            GN ACADEMY · AI READINESS TEST
          </div>
        </div>

        {score !== null ? (
          <div style={{ alignItems: "baseline", display: "flex", gap: 24 }}>
            <div style={{ fontSize: 220, fontWeight: 700 }}>{score}</div>
            <div style={{ color: "#8FA3BF", fontSize: 64 }}>/100</div>
            <div
              style={{
                border: "3px solid #C08A2E",
                borderRadius: 999,
                color: "#C08A2E",
                fontSize: 40,
                marginLeft: 40,
                padding: "12px 36px",
              }}
            >
              {levelLabel}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 72, fontWeight: 700 }}>
            How ready are you for AI-powered work?
          </div>
        )}

        <div style={{ color: "#8FA3BF", display: "flex", fontSize: 30 }}>
          Free test · 15 real work scenarios · gnacademy
        </div>
      </div>
    ),
    size,
  );
}
