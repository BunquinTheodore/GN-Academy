import type { Metadata } from "next";
import Link from "next/link";
import { listAllAssessments } from "@/lib/db/assessments";
import { listAllCertifications } from "@/lib/db/certifications";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Question sets",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  diagnostic: "Diagnostic",
  knowledge: "Knowledge exam",
  practical: "Practical",
  simulation: "Simulation",
};

export default async function AdminQuestionsPage() {
  const [assessments, certifications] = await Promise.all([
    listAllAssessments().catch(() => null),
    listAllCertifications().catch(() => []),
  ]);
  const certById = new Map(certifications.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Question sets</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          The AI Readiness Test and every certification exam. Edited questions
          take effect for the next person who starts — correct answers never
          leave the server.
        </p>
      </div>

      {assessments === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load question sets. Refresh to try again.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assessments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/questions/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50"
              >
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {a.slug} · {TYPE_LABEL[a.type] ?? a.type}
                    {a.certification_id &&
                      ` · ${certById.get(a.certification_id)?.title ?? "unknown certification"}`}
                  </p>
                </div>
                <Badge variant={a.is_published ? "default" : "secondary"}>
                  {a.is_published ? "Published" : "Draft"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
