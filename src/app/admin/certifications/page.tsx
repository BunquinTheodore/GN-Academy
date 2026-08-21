import type { Metadata } from "next";
import Link from "next/link";
import { listAllCertifications } from "@/lib/db/certifications";
import { formatPhp } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Certifications",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCertificationsPage() {
  const certifications = await listAllCertifications().catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Certifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything on the public catalogue, plus drafts. Edits go live on
            the next page load, with no deploy needed.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/certifications/new">New certification</Link>
        </Button>
      </div>

      {certifications === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load certifications. Refresh to try again.
        </p>
      ) : certifications.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-muted-foreground">
          No certifications yet. Create the first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {certifications.map((cert) => (
            <li key={cert.id}>
              <Link
                href={`/admin/certifications/${cert.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50"
              >
                <div>
                  <p className="font-medium">{cert.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    /{cert.slug} · {cert.credential_prefix}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {cert.is_free
                      ? "Free"
                      : cert.price_php
                        ? formatPhp(cert.price_php)
                        : "n/a"}
                  </span>
                  <Badge variant={cert.is_published ? "default" : "secondary"}>
                    {cert.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
