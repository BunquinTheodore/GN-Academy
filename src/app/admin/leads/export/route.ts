import { getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/admin";
import { listAllLeadsForExport } from "@/lib/db/leads";
import { toCsv } from "@/lib/csv";

const COLUMNS = [
  "created_at",
  "email",
  "full_name",
  "phone",
  "source",
  "career_path",
  "marketing_consent",
  "attempt_id",
];

/**
 * Lead CSV export. This route hands over every email address the platform
 * holds, so it re-checks the admin claim itself rather than trusting the
 * /admin layout, and records who took the export.
 */
export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  if (!user?.admin) {
    // Same 404 posture as the admin layout: don't confirm the route exists.
    return new Response("Not found", { status: 404 });
  }

  try {
    const leads = await listAllLeadsForExport();
    await auditLog({
      actorId: user.uid,
      action: "leads.exported",
      entity: "leads",
      metadata: { rows: leads.length },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(toCsv(leads, COLUMNS), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gn-academy-leads-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("lead export failed", e);
    return new Response("Export failed", { status: 500 });
  }
}
