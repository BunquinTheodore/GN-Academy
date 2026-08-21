import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { z } from "zod";
import {
  getCertificationById,
  getModulesWithLessons,
} from "@/lib/db/certifications";
import { listAllAssessments } from "@/lib/db/assessments";
import { AdminForm } from "@/components/admin/admin-form";
import { Badge } from "@/components/ui/badge";
import { CertificationFields } from "../certification-fields";
import { saveCertificationAction } from "../actions";
import { ModuleEditor, NewModuleForm } from "./module-editor";

export const metadata: Metadata = {
  title: "Edit certification",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditCertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const id = parsed.data;

  const cert = await getCertificationById(id).catch(() => null);
  if (!cert) notFound();

  const [modules, assessments] = await Promise.all([
    getModulesWithLessons(id).catch(() => []),
    listAllAssessments().catch(() => []),
  ]);
  const exams = assessments.filter((a) => a.certification_id === id);
  const nextModuleOrder =
    modules.reduce((max, m) => Math.max(max, m.module.sort_order), 0) + 1;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/certifications"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Certifications
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{cert.title}</h1>
          <Badge variant={cert.is_published ? "default" : "secondary"}>
            {cert.is_published ? "Published" : "Draft"}
          </Badge>
          {cert.is_published && (
            <Link
              href={`/certifications/${cert.slug}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View public page
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <section className="max-w-3xl">
        <h2 className="font-display text-lg font-semibold">Details</h2>
        <div className="mt-4">
          <AdminForm action={saveCertificationAction}>
            <CertificationFields cert={cert} />
          </AdminForm>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Curriculum</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Modules hold lessons. Lesson bodies are Markdown, so headings, lists,
          bold, and links all work. Preview lessons are readable without
          enrolling; everything else is gated.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {modules.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No modules yet. Add the first one below.
            </p>
          ) : (
            modules.map(({ module, lessons }) => (
              <ModuleEditor
                key={module.id}
                certificationId={id}
                module={module}
                lessons={lessons}
              />
            ))
          )}
        </div>

        <div className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Add a module</h3>
          <div className="mt-3">
            <NewModuleForm
              certificationId={id}
              defaultSortOrder={nextModuleOrder}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Exam</h2>
        {exams.length === 0 ? (
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            No exam is attached to this certification yet, so no credential can
            be issued for it. Exams are created in the database with the
            certification linked; the question editor then lives under{" "}
            <Link href="/admin/questions" className="text-primary hover:underline">
              question sets
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {exams.map((exam) => (
              <li key={exam.id}>
                <Link
                  href={`/admin/questions/${exam.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50"
                >
                  <div>
                    <p className="font-medium">{exam.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {exam.slug} · pass {exam.passing_score ?? 70} ·{" "}
                      {exam.max_attempts} attempts
                    </p>
                  </div>
                  <Badge variant={exam.is_published ? "default" : "secondary"}>
                    {exam.is_published ? "Published" : "Draft"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
