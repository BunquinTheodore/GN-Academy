import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPublishedCertificationBySlug } from "@/lib/db/certifications";
import { getEnrollment } from "@/lib/db/enrollments";
import { formatPhp } from "@/lib/format";
import { site } from "@/content/site";
import { EnrollForm } from "./enroll-form";

export const metadata: Metadata = {
  title: "Enroll",
  robots: { index: false, follow: false },
};

export default async function EnrollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/certifications/${slug}/enroll`)}`);

  const cert = await getPublishedCertificationBySlug(slug).catch(() => null);
  if (!cert) notFound();

  const existing = await getEnrollment(user.uid, cert.id).catch(() => null);
  if (existing && existing.status !== "rejected") redirect("/dashboard/courses");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex justify-center px-4 py-6">
        <Link href="/" className="font-display text-lg font-semibold">
          {site.name}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16">
        <h1 className="font-display text-2xl font-semibold">
          {cert.is_free ? "Start the free course" : "Enroll"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{cert.title}</p>

        {!cert.is_free && cert.price_php && (
          <div className="mt-6 rounded-lg border border-border bg-card p-5 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Certification fee</span>
              <span className="font-mono text-lg font-semibold">
                {formatPhp(cert.price_php)}
              </span>
            </div>
            <div className="mt-4 border-t border-border pt-4 text-muted-foreground">
              <p className="font-medium text-foreground">How to pay</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                {/* TODO(blocked): real GCash/Maya receiving numbers — see BLOCKED.md */}
                <li>
                  Send {formatPhp(cert.price_php)} via GCash or Maya to the
                  account number shown on our payment instructions page
                  (published with the first cohort).
                </li>
                <li>Keep the receipt — copy its reference number.</li>
                <li>Enter the reference number below.</li>
              </ol>
              <p className="mt-3">
                We confirm payments manually within 24 hours. Your enrollment
                shows as <span className="font-medium text-foreground">pending</span>{" "}
                until then, and the reference number is how we match it.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <EnrollForm slug={cert.slug} isFree={cert.is_free} />
        </div>
      </main>
    </div>
  );
}
