"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { buildCertificateCanvases } from "./certificate-face";
import { formatIssueDate } from "./certificate-face-layout";
import { createCertificateScene, type SceneHandle } from "./certificate-scene";
import { keyToNudge } from "./rotation-math";

export type Certificate3DViewerProps = {
  holderName: string;
  title: string;
  level?: string;
  credentialCode: string;
  issuedAt: Date | string;
  verifyUrl: string;
  className?: string;
  /** Called when WebGL or the canvas cannot start, so the parent can show the flat card. */
  onUnavailable?: (reason: string) => void;
};

type Status = "loading" | "ready" | "interrupted" | "failed";

/** Mid-range phones get a smaller texture (about 4.5 MB instead of 8 MB of GPU memory). */
const LOW_MEMORY_GB = 4;
const REDUCED_TEXTURE_SCALE = 0.75;

function pickPixelScale(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const modest =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= LOW_MEMORY_GB) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);
  return modest ? REDUCED_TEXTURE_SCALE : 1;
}

export function Certificate3DViewer({
  holderName,
  title,
  level,
  credentialCode,
  issuedAt,
  verifyUrl,
  className,
  onUnavailable,
}: Certificate3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  const issuedKey = issuedAt instanceof Date ? issuedAt.toISOString() : issuedAt;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    let cancelled = false;
    let scene: SceneHandle | null = null;

    const run = async () => {
      try {
        const faces = await buildCertificateCanvases(
          { holderName, title, level, credentialCode, issuedAt: issuedKey, verifyUrl },
          pickPixelScale(),
        );
        if (cancelled) return;
        scene = createCertificateScene({
          canvas,
          container,
          faces,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          onContextLost: () => setStatus("interrupted"),
          onContextRestored: () => setStatus("ready"),
        });
        sceneRef.current = scene;
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setStatus("failed");
        const reason = error instanceof Error ? error.message : "3D view failed to start";
        onUnavailableRef.current?.(reason);
      }
    };
    void run();

    return () => {
      cancelled = true;
      sceneRef.current = null;
      scene?.dispose();
    };
  }, [holderName, title, level, credentialCode, issuedKey, verifyUrl]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      sceneRef.current?.reset();
      return;
    }
    const nudge = keyToNudge(event.key);
    if (!nudge) return;
    event.preventDefault();
    sceneRef.current?.nudge(nudge);
  };

  const issued = formatIssueDate(issuedAt);

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div
        ref={containerRef}
        role="group"
        tabIndex={0}
        aria-label="Interactive 3D certificate. Use the arrow keys to turn it and Escape to reset."
        onKeyDown={onKeyDown}
        className={cn(
          "gn-shine relative aspect-[1684/1190] w-full overflow-hidden rounded-xl",
          "border border-[color-mix(in_oklab,white_45%,transparent)]",
          "bg-[color-mix(in_oklab,var(--card)_55%,transparent)]",
          "shadow-[inset_0_1px_0_0_color-mix(in_oklab,white_60%,transparent),0_18px_40px_-20px_color-mix(in_oklab,var(--brand)_40%,transparent)]",
          "backdrop-blur-md backdrop-saturate-150",
          "cursor-grab select-none active:cursor-grabbing",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 size-full touch-pan-y"
          style={{ touchAction: "pan-y" }}
        />
        {status !== "ready" && (
          <p
            role="status"
            className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-muted-foreground"
          >
            {status === "loading" && "Preparing the 3D certificate..."}
            {status === "interrupted" && "The display was interrupted. Restoring..."}
            {status === "failed" && "The 3D view could not start."}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag to turn the certificate and move over it to catch the light. Arrow
        keys also turn it, Escape resets.
      </p>
      <p className="sr-only">
        Certificate of {title}
        {level ? `, ${level}` : ""}, awarded to {holderName}.
        {issued ? ` Issued ${issued}.` : ""} Credential code {credentialCode}.
        Verify at {verifyUrl}.
      </p>
    </div>
  );
}
