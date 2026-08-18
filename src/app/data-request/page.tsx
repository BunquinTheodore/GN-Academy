import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "Data requests",
  description:
    "Request access to, correction of, or deletion of your personal data.",
};

export default function DataRequestPage() {
  return (
    <PageShell title="Data requests">
      <p>
        Under the Data Privacy Act of 2012 (RA 10173) you can ask to see,
        correct, or delete the personal data we hold about you.
      </p>
      {/* TODO(phase-4): request form routed to the admin queue */}
      <p>
        The self-service form is coming. Until it ships, email{" "}
        <a
          href="mailto:gnclub.contactus@gmail.com"
          className="text-primary underline underline-offset-4"
        >
          gnclub.contactus@gmail.com
        </a>{" "}
        from your account email and we&apos;ll process the request manually.
      </p>
    </PageShell>
  );
}
