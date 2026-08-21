import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { AdminForm } from "@/components/admin/admin-form";
import { Badge } from "@/components/ui/badge";
import { resolveEnquiryAction } from "./actions";

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Enquiry = {
  id: string;
  employer_name: string;
  employer_email: string;
  company: string | null;
  message: string;
  status: "new" | "handled" | "spam";
  created_at: string;
  profiles: { username: string | null; full_name: string | null } | null;
};

async function listEnquiries(): Promise<Enquiry[] | null> {
  const { data, error } = await supabaseAdmin()
    .from("employer_enquiries")
    .select("*, profiles ( username, full_name )")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return null;
  return (data ?? []) as never;
}

export default async function AdminEnquiriesPage() {
  const enquiries = await listEnquiries();
  const open = enquiries?.filter((e) => e.status === "new") ?? [];
  const closed = enquiries?.filter((e) => e.status !== "new") ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Enquiries</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Employers asking about specific talent, or about a role in general.
          Reply from your own inbox — this queue is a record, not a mailbox.
        </p>
      </div>

      {enquiries === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load enquiries. Refresh to try again.
        </p>
      ) : (
        <>
          <section>
            <h2 className="font-display text-lg font-semibold">
              New ({open.length})
            </h2>
            {open.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-border p-8 text-muted-foreground">
                Nothing waiting.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {open.map((enquiry) => (
                  <li
                    key={enquiry.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {enquiry.employer_name}
                          {enquiry.company && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {enquiry.company}
                            </span>
                          )}
                        </p>
                        <a
                          href={`mailto:${enquiry.employer_email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {enquiry.employer_email}
                        </a>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(enquiry.created_at)}
                      </span>
                    </div>

                    {enquiry.profiles?.username && (
                      <p className="mt-2 text-sm">
                        About{" "}
                        <Link
                          href={`/talent/${enquiry.profiles.username}`}
                          className="text-primary hover:underline"
                        >
                          {enquiry.profiles.full_name ??
                            enquiry.profiles.username}
                        </Link>
                      </p>
                    )}

                    <p className="mt-3 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                      {enquiry.message}
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <AdminForm
                        action={resolveEnquiryAction}
                        submitLabel="Mark handled"
                      >
                        <input
                          type="hidden"
                          name="enquiryId"
                          value={enquiry.id}
                        />
                        <input type="hidden" name="status" value="handled" />
                      </AdminForm>
                      <AdminForm
                        action={resolveEnquiryAction}
                        submitLabel="Mark spam"
                        destructive
                      >
                        <input
                          type="hidden"
                          name="enquiryId"
                          value={enquiry.id}
                        />
                        <input type="hidden" name="status" value="spam" />
                      </AdminForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold">Closed</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {closed.map((enquiry) => (
                  <li
                    key={enquiry.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                  >
                    <span>
                      {enquiry.employer_name}
                      {enquiry.company ? ` · ${enquiry.company}` : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(enquiry.created_at)}
                      </span>
                      <Badge
                        variant={
                          enquiry.status === "spam"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {enquiry.status}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
