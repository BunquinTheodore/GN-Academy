import type { Metadata } from "next";
import { countLeads, listLeads } from "@/lib/db/leads";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SHOWN = 200;

export default async function AdminLeadsPage() {
  const [leads, counts] = await Promise.all([
    listLeads(SHOWN).catch(() => null),
    countLeads().catch(() => ({ total: 0, consented: 0 })),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leads</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {counts.total} captured · {counts.consented} consented to
            marketing. Resend is a transactional sender on the free plan, so
            campaigns go out from whatever list tool you export into — and only
            to the consented rows.
          </p>
        </div>
        <Button asChild variant="outline">
          {/* A plain link, not fetch(): the browser handles the download. */}
          <a href="/admin/leads/export" download>
            Export CSV
          </a>
        </Button>
      </div>

      {leads === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load leads. Refresh to try again.
        </p>
      ) : leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-muted-foreground">
          No leads yet. They arrive from the AI Readiness Test email gate.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Captured leads, newest first
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase">
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Source</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Marketing</th>
                  <th className="p-3 font-medium">Captured</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-3">{lead.email}</td>
                    <td className="p-3 text-muted-foreground">{lead.source}</td>
                    <td className="p-3 text-muted-foreground">
                      {lead.career_path ?? "—"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          lead.marketing_consent ? "default" : "secondary"
                        }
                      >
                        {lead.marketing_consent ? "Consented" : "No"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {counts.total > SHOWN && (
            <p className="text-sm text-muted-foreground">
              Showing the {SHOWN} most recent of {counts.total}. The CSV export
              contains all of them.
            </p>
          )}
        </>
      )}
    </div>
  );
}
