import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Verify a credential",
  description:
    "Check any GN Academy credential code and see exactly what its holder earned. No account needed.",
  alternates: { canonical: "/verify" },
};

async function lookupAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  redirect(`/verify/${encodeURIComponent(code || "unknown")}`);
}

export default function VerifyPage() {
  return (
    <PageShell title="Verify a credential">
      <p>
        Every GN Academy credential has a code like{" "}
        <span className="font-mono text-foreground">CAVA-2026-001248</span>,
        printed on the certificate and listed on the holder&apos;s CV. Enter it
        below to see the holder, certification, competencies, and status.
      </p>

      <form action={lookupAction} className="flex max-w-md flex-col gap-3">
        <Label htmlFor="code">Credential code</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            name="code"
            placeholder="CAVA-2026-000001"
            autoComplete="off"
            className="h-12 font-mono uppercase"
            required
          />
          <Button type="submit" className="h-12">
            Verify
          </Button>
        </div>
      </form>

      <p className="text-sm">
        Verification pages are public and permanent. A revoked credential shows
        as revoked. It never silently disappears.
      </p>
    </PageShell>
  );
}
