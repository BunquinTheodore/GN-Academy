import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Verify a credential",
  description:
    "Check any GN Academy credential code and see exactly what its holder earned.",
};

export default function VerifyPage() {
  return (
    <PageShell title="Verify a credential">
      <p>
        Every GN Academy credential has a code like{" "}
        <span className="font-mono text-foreground">CAVA-2026-001248</span>.
        Enter one here and see the holder, certification, and issue date —
        no account needed.
      </p>
      {/* TODO(phase-3): lookup form + /verify/[code] public record page */}
      <p className="rounded-md border border-dashed border-border p-4 text-sm">
        Credential lookup opens with our first certification cohort.
      </p>
    </PageShell>
  );
}
