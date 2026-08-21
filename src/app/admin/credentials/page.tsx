import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { searchCredentials } from "@/lib/db/credentials";
import { formatDate } from "@/lib/format";
import { AdminForm } from "@/components/admin/admin-form";
import { TextAreaField } from "@/components/admin/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideCredentialAction } from "./actions";

export const metadata: Metadata = {
  title: "Credentials",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCredentialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").slice(0, 100);
  const credentials = await searchCredentials(query).catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Credentials</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Revoking a credential does not delete it. The verification page keeps
          working and says <em>revoked</em>, with your reason. A credential
          that silently vanishes is easier to explain away than one that
          visibly failed.
        </p>
      </div>

      <form className="flex max-w-md gap-2" role="search">
        <div className="flex-1">
          <Label htmlFor="q" className="sr-only">
            Search credentials
          </Label>
          <Input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Code or holder name"
            className="h-11"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="outline" className="h-11">
          Search
        </Button>
      </form>

      {credentials === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load credentials. Refresh to try again.
        </p>
      ) : credentials.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-muted-foreground">
          {query
            ? `Nothing matches "${query}".`
            : "No credentials have been issued yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {credentials.map((c) => (
            <li key={c.id}>
              <details className="rounded-lg border border-border bg-card">
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-mono text-sm">{c.credential_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.holder_name} · {c.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.issued_at)}
                    </span>
                    <Badge
                      variant={c.status === "active" ? "default" : "destructive"}
                    >
                      {c.status}
                    </Badge>
                  </div>
                </summary>

                <div className="flex flex-col gap-4 border-t border-border p-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>{c.profiles?.email ?? "no linked account"}</span>
                    <Link
                      href={`/verify/${c.credential_code}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Verification page
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </div>

                  {c.status === "revoked" && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      Revoked
                      {c.revoked_at && ` on ${formatDate(c.revoked_at)}`}
                      {c.revoked_reason && `: ${c.revoked_reason}`}
                    </p>
                  )}

                  {c.status === "active" ? (
                    <AdminForm
                      action={decideCredentialAction}
                      submitLabel="Revoke this credential"
                      destructive
                    >
                      <input
                        type="hidden"
                        name="credentialId"
                        value={c.id}
                      />
                      <input type="hidden" name="decision" value="revoke" />
                      <TextAreaField
                        name="reason"
                        label="Public reason"
                        rows={2}
                        required
                        hint="Shown on the verification page. Write it for the employer reading it, not for the file."
                      />
                    </AdminForm>
                  ) : (
                    <AdminForm
                      action={decideCredentialAction}
                      submitLabel="Reinstate"
                    >
                      <input
                        type="hidden"
                        name="credentialId"
                        value={c.id}
                      />
                      <input type="hidden" name="decision" value="reinstate" />
                      <p className="text-sm text-muted-foreground">
                        Clears the revocation and shows the credential as
                        active again.
                      </p>
                    </AdminForm>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
