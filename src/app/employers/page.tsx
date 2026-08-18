import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "For employers",
  description:
    "Hire Filipino talent with verified AI skills — check any credential in seconds.",
};

export default function EmployersPage() {
  return (
    <PageShell title="For employers">
      <p>
        Every GN Academy credential can be verified at a public URL — holder
        name, certification, competencies, and issue date. No screenshots, no
        take-our-word-for-it.
      </p>
      {/* TODO(phase-5): talent directory with filters + enquiry form */}
      <p className="rounded-md border border-dashed border-border p-4 text-sm">
        The searchable talent directory opens with our first certified cohort.
        Until then, ask any candidate for their credential code and check it at
        /verify.
      </p>
    </PageShell>
  );
}
