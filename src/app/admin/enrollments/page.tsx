import type { Metadata } from "next";
import { listPendingEnrollments } from "@/lib/db/enrollments";
import { formatDate, formatPhp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { decideEnrollmentAction } from "./actions";

export const metadata: Metadata = {
  title: "Enrollments",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminEnrollmentsPage() {
  const pending = await listPendingEnrollments().catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Pending enrollments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Match each payment reference against the GCash/Maya account before
          approving. Every decision is audit-logged.
        </p>
      </div>

      {pending === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load the queue. Refresh to try again.
        </p>
      ) : pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-muted-foreground">
          Queue is clear. No payments waiting for confirmation.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="p-3 font-medium">Student</th>
                <th className="p-3 font-medium">Certification</th>
                <th className="p-3 font-medium">Method</th>
                <th className="p-3 font-medium">Reference</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Submitted</th>
                <th className="p-3 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{e.profiles?.full_name ?? "n/a"}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.profiles?.email}
                    </p>
                  </td>
                  <td className="p-3">{e.certifications?.title ?? "n/a"}</td>
                  <td className="p-3 uppercase">{e.payment_method ?? "n/a"}</td>
                  <td className="p-3 font-mono">{e.payment_ref ?? "n/a"}</td>
                  <td className="p-3 font-mono">
                    {e.amount_paid_php != null ? formatPhp(e.amount_paid_php) : "n/a"}
                  </td>
                  <td className="p-3">{formatDate(e.enrolled_at)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <form action={decideEnrollmentAction}>
                        <input type="hidden" name="enrollmentId" value={e.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                      <form action={decideEnrollmentAction}>
                        <input type="hidden" name="enrollmentId" value={e.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" size="sm" variant="outline">
                          Reject
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
