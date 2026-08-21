import type { Metadata } from "next";
import { listDataRequests } from "@/lib/db/data-requests";
import { formatDate } from "@/lib/format";
import { AdminForm } from "@/components/admin/admin-form";
import { TextAreaField, TextField } from "@/components/admin/field";
import { Badge } from "@/components/ui/badge";
import {
  executeDeletionAction,
  resolveDataRequestAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Data requests",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  access: "Copy of my data",
  correction: "Correction",
  deletion: "Deletion",
};

export default async function AdminDataRequestsPage() {
  const requests = await listDataRequests().catch(() => null);
  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const resolved = requests?.filter((r) => r.status !== "pending") ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Data requests</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          RA 10173 gives 15 working days to reply. Verify the person owns the
          address before acting. This queue is a request, not an
          authorisation.
        </p>
      </div>

      {requests === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load requests. Refresh to try again.
        </p>
      ) : (
        <>
          <section>
            <h2 className="font-display text-lg font-semibold">
              Pending ({pending.length})
            </h2>

            {pending.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-border p-8 text-muted-foreground">
                Queue is clear.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {pending.map((request) => (
                  <li key={request.id}>
                    <details className="rounded-lg border border-border bg-card">
                      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium">{request.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(request.created_at)}
                            {request.user_id ? " · signed in" : " · signed out"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            request.kind === "deletion"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {KIND_LABEL[request.kind] ?? request.kind}
                        </Badge>
                      </summary>

                      <div className="flex flex-col gap-6 border-t border-border p-4">
                        {request.details && (
                          <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                            {request.details}
                          </p>
                        )}

                        {request.kind === "deletion" && (
                          <div className="rounded-lg border border-destructive/40 p-4">
                            <h3 className="text-sm font-semibold">
                              Execute the erasure
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Deletes the profile, attempts, enrollments,
                              progress, and lead rows, and removes the sign-in.
                              Credentials are kept and unlinked, which is what
                              the privacy page promises, and employers holding
                              a code must still get an answer.
                            </p>
                            <div className="mt-4">
                              <AdminForm
                                action={executeDeletionAction}
                                submitLabel="Delete this account permanently"
                                destructive
                              >
                                <input
                                  type="hidden"
                                  name="requestId"
                                  value={request.id}
                                />
                                <TextField
                                  name="confirmEmail"
                                  label="Type the requester's email to confirm"
                                  required
                                  placeholder={request.email}
                                />
                              </AdminForm>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-border pt-4">
                          <h3 className="text-sm font-semibold">
                            Close without deleting
                          </h3>
                          <div className="mt-3 grid gap-6 sm:grid-cols-2">
                            <AdminForm
                              action={resolveDataRequestAction}
                              submitLabel="Mark completed"
                            >
                              <input
                                type="hidden"
                                name="requestId"
                                value={request.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value="completed"
                              />
                              <TextAreaField
                                name="note"
                                label="What you did"
                                rows={2}
                              />
                            </AdminForm>

                            <AdminForm
                              action={resolveDataRequestAction}
                              submitLabel="Reject"
                            >
                              <input
                                type="hidden"
                                name="requestId"
                                value={request.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value="rejected"
                              />
                              <TextAreaField
                                name="note"
                                label="Why"
                                rows={2}
                                hint="e.g. identity couldn't be verified."
                              />
                            </AdminForm>
                          </div>
                        </div>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {resolved.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold">Resolved</h2>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">Resolved data requests</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase">
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Kind</th>
                      <th className="p-3 font-medium">Outcome</th>
                      <th className="p-3 font-medium">Note</th>
                      <th className="p-3 font-medium">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map((request) => (
                      <tr
                        key={request.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="p-3">{request.email}</td>
                        <td className="p-3 text-muted-foreground">
                          {KIND_LABEL[request.kind] ?? request.kind}
                        </td>
                        <td className="p-3">{request.status}</td>
                        <td className="p-3 text-muted-foreground">
                          {request.resolution_note ?? "n/a"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {request.resolved_at
                            ? formatDate(request.resolved_at)
                            : "n/a"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
