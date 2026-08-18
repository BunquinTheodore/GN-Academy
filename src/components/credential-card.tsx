import { BadgeCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type CredentialCardState = "locked" | "goal" | "earned" | "verified";

type CredentialCardProps = {
  state: CredentialCardState;
  holderName: string;
  title: string;
  level?: string;
  credentialCode?: string;
  issuedAt?: Date | string | null;
  className?: string;
};

function formatIssueDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

/**
 * The credential card (§11): one component, four emotional states.
 *  - locked   → test results: what you could have, greyed out
 *  - goal     → dashboard: the thing you are working toward
 *  - earned   → profile: the achievement
 *  - verified → /verify/[code]: public proof, institutional
 */
export function CredentialCard({
  state,
  holderName,
  title,
  level,
  credentialCode,
  issuedAt,
  className,
}: CredentialCardProps) {
  const issued = formatIssueDate(issuedAt);
  const isInkCard = state === "earned" || state === "verified";

  return (
    <div
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-lg border shadow-sm",
        isInkCard && "border-ink/60 bg-ink text-white",
        state === "locked" && "border-border bg-muted text-muted-foreground",
        state === "goal" &&
          "border-dashed border-muted-foreground/40 bg-card text-card-foreground",
        className,
      )}
      aria-label={
        state === "locked"
          ? "Locked credential — not yet verified"
          : state === "goal"
            ? "Credential goal — not yet earned"
            : `Credential: ${title}, ${holderName}`
      }
    >
      {/* subtle guilloche-style texture on real credentials */}
      {isInkCard && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 120% -20%, transparent 0, transparent 10px, currentColor 11px)",
          }}
        />
      )}

      <div className="relative flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-[0.65rem] font-medium tracking-[0.18em] uppercase",
                isInkCard ? "text-white/60" : "text-muted-foreground",
              )}
            >
              GN Academy
            </p>
            <p
              className={cn(
                "text-[0.65rem] tracking-[0.18em] uppercase",
                isInkCard ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {level ?? "Professional certification"}
            </p>
          </div>

          {state === "verified" || state === "earned" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-verified-foreground uppercase">
              <BadgeCheck className="size-3.5" aria-hidden />
              Verified
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide uppercase",
                "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              <Lock className="size-3" aria-hidden />
              {state === "locked" ? "Unverified" : "Not yet earned"}
            </span>
          )}
        </div>

        <div>
          <p
            className={cn(
              "font-display text-xl leading-snug font-semibold text-balance",
              state === "locked" && "blur-[1.5px] select-none",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              isInkCard ? "text-white/70" : "text-muted-foreground",
              state === "locked" && "blur-[1.5px] select-none",
            )}
          >
            {holderName}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-[0.6rem] tracking-[0.15em] uppercase",
                isInkCard ? "text-white/70" : "text-muted-foreground",
              )}
            >
              Credential code
            </p>
            <p className="font-mono text-sm tracking-wider">
              {credentialCode ?? "— — — —"}
            </p>
          </div>
          {issued && (
            <div className="text-right">
              <p
                className={cn(
                  "text-[0.6rem] tracking-[0.15em] uppercase",
                  isInkCard ? "text-white/70" : "text-muted-foreground",
                )}
              >
                Issued
              </p>
              <p className="text-sm">{issued}</p>
            </div>
          )}
        </div>

        {state === "locked" && (
          <p className="border-t border-border pt-4 text-sm font-medium text-foreground">
            Your score is unverified — employers can&apos;t see it.
          </p>
        )}
        {state === "goal" && (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            Finish your certification to earn this credential.
          </p>
        )}
      </div>
    </div>
  );
}
