import type { Metadata } from "next";
import Link from "next/link";
import { getFunnelMetrics, rate, type FunnelCounts } from "@/lib/db/metrics";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** §13 targets. A rate below target is called out, not quietly coloured in. */
const TARGETS = { startToComplete: 60, completeToEmail: 40 } as const;

const SECTIONS = [
  { href: "/admin/certifications", label: "Certifications" },
  { href: "/admin/questions", label: "Question sets" },
  { href: "/admin/posts", label: "Blog" },
  { href: "/admin/enrollments", label: "Pending enrollments" },
  { href: "/admin/credentials", label: "Credentials" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/data-requests", label: "Data requests" },
];

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ConversionRow({
  label,
  numerator,
  denominator,
  target,
}: {
  label: string;
  numerator: number;
  denominator: number;
  target?: number;
}) {
  const value = rate(numerator, denominator);
  const belowTarget = target !== undefined && value !== null && value < target;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="flex items-baseline gap-3">
        {target !== undefined && (
          <span className="text-xs text-muted-foreground">
            target {target}%
          </span>
        )}
        <span
          className={
            belowTarget
              ? "font-mono text-lg font-semibold text-destructive"
              : "font-mono text-lg font-semibold"
          }
        >
          {value === null ? "—" : `${value}%`}
        </span>
      </span>
    </div>
  );
}

function FunnelPanel({
  heading,
  counts,
}: {
  heading: string;
  counts: FunnelCounts;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold">{heading}</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tests started" value={String(counts.testsStarted)} />
        <Stat label="Tests completed" value={String(counts.testsCompleted)} />
        <Stat label="Emails captured" value={String(counts.emailsCaptured)} />
        <Stat
          label="Credentials issued"
          value={String(counts.credentialsIssued)}
          hint="Excludes demo records"
        />
        <Stat label="Free enrollments" value={String(counts.freeEnrollments)} />
        <Stat
          label="Paid enrollments"
          value={String(counts.paidEnrollments)}
          hint="Submitted, including still-pending payments"
        />
        <Stat label="Payments confirmed" value={String(counts.paidConfirmed)} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card px-4">
        <ConversionRow
          label="Test started → completed"
          numerator={counts.testsCompleted}
          denominator={counts.testsStarted}
          target={TARGETS.startToComplete}
        />
        <ConversionRow
          label="Test completed → email captured"
          numerator={counts.emailsCaptured}
          denominator={counts.testsCompleted}
          target={TARGETS.completeToEmail}
        />
        <ConversionRow
          label="Email captured → free enrollment"
          numerator={counts.freeEnrollments}
          denominator={counts.emailsCaptured}
        />
        <ConversionRow
          label="Paid enrollment → payment confirmed"
          numerator={counts.paidConfirmed}
          denominator={counts.paidEnrollments}
        />
        <ConversionRow
          label="Free enrollment → credential issued"
          numerator={counts.credentialsIssued}
          denominator={counts.freeEnrollments}
        />
      </div>
    </section>
  );
}

export default async function AdminPage() {
  const metrics = await getFunnelMetrics().catch(() => null);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-semibold">Admin</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <Button key={section.href} asChild variant="outline">
              <Link href={section.href}>{section.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {metrics === null ? (
        <p className="rounded-lg border border-destructive/40 p-5 text-sm">
          Couldn&apos;t load the funnel. Refresh to try again.
        </p>
      ) : (
        <>
          <FunnelPanel heading="Last 30 days" counts={metrics.last30Days} />
          <FunnelPanel heading="All time" counts={metrics.allTime} />
          <p className="max-w-prose text-sm text-muted-foreground">
            These come from the database, not from the analytics provider —
            payment confirmations and credential issuance are things staff do
            on the server, which no browser beacon can see. A rate shows{" "}
            <span className="font-mono">—</span> when nothing has entered that
            stage yet; 0% would imply a real measurement.
          </p>
        </>
      )}
    </div>
  );
}
