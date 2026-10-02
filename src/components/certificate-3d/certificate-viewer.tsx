"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";

import { CredentialCard } from "@/components/credential-card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  UNAVAILABLE_MESSAGES,
  classifyDevice,
  type DeviceClass,
} from "./device-eligibility";
import { readDeviceSignals } from "./read-device-signals";

/** How far past the screen edge a certificate still counts as "near". */
const NEAR_VIEWPORT_MARGIN = "300px 0px";

/**
 * Same aspect ratio as the viewer's paper (1684 x 1190), so the page does not
 * jump when the three.js chunk arrives.
 */
function ViewerPlaceholder() {
  return (
    <div
      role="status"
      aria-label="Loading the 3D certificate"
      className="aspect-[1684/1190] w-full animate-pulse rounded-xl bg-muted/40"
    />
  );
}

const Certificate3DViewer = dynamic(
  () => import("./certificate-3d-viewer").then((m) => m.Certificate3DViewer),
  { ssr: false, loading: ViewerPlaceholder },
);

export type CertificateViewerProps = {
  holderName: string;
  title: string;
  level?: string;
  credentialCode: string;
  issuedAt: Date | string;
  /** Full public verification URL, printed on the certificate. */
  verifyUrl: string;
  className?: string;
  /** Replaces the default flat CredentialCard shown while 3D loads or if it cannot run. */
  poster?: ReactNode;
};

type DeviceState = DeviceClass | "pending";

/** The server and the first client render agree on "pending", then it resolves. */
function useDeviceState(): DeviceState {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => classifyDevice(readDeviceSignals()),
    () => "pending",
  );
}

/** True while the element is on screen or within a screen of it. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: NEAR_VIEWPORT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, near };
}

function CertificateDetails({
  holderName,
  title,
  level,
  credentialCode,
  issuedAt,
}: Pick<
  CertificateViewerProps,
  "holderName" | "title" | "level" | "credentialCode" | "issuedAt"
>) {
  const rows: ReadonlyArray<readonly [string, string, boolean?]> = [
    ["Awarded to", holderName],
    ["Certificate", title],
    ...(level ? ([["Level", level]] as const) : []),
    ["Issued", formatDate(issuedAt)],
    ["Credential code", credentialCode, true],
  ];
  return (
    <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value, mono]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={cn("font-medium", mono && "font-mono")}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The certificate as an interactive 3D sheet of paper, shown by default with
 * its details beside it. The flat card stands in only while the 3D chunk loads
 * and on devices that cannot run it (no WebGL, or Data Saver on).
 */
export function CertificateViewer({
  holderName,
  title,
  level,
  credentialCode,
  issuedAt,
  verifyUrl,
  className,
  poster,
}: CertificateViewerProps) {
  const device = useDeviceState();
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const [failure, setFailure] = useState<string | null>(null);

  const canShow3D = device === "ready" || device === "low-end";
  const show3D = canShow3D && near && failure === null;
  const note = failure ?? (device === "pending" ? "" : UNAVAILABLE_MESSAGES[device]);

  const handleUnavailable = useCallback(() => {
    setFailure("The 3D view could not start on this device. Showing the flat certificate.");
  }, []);

  const flat = poster ?? (
    <CredentialCard
      state="earned"
      holderName={holderName}
      title={title}
      level={level}
      credentialCode={credentialCode}
      issuedAt={issuedAt}
    />
  );

  return (
    <div ref={ref} className={cn("flex w-full flex-col items-start gap-4", className)}>
      {show3D ? (
        <Certificate3DViewer
          holderName={holderName}
          title={title}
          level={level}
          credentialCode={credentialCode}
          issuedAt={issuedAt}
          verifyUrl={verifyUrl}
          onUnavailable={handleUnavailable}
        />
      ) : (
        flat
      )}
      <CertificateDetails
        holderName={holderName}
        title={title}
        level={level}
        credentialCode={credentialCode}
        issuedAt={issuedAt}
      />
      {note && (
        <p role="status" className="text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
