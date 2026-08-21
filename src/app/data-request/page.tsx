import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";
import { DataRequestForm } from "./data-request-form";

export const metadata: Metadata = {
  title: "Data requests",
  description:
    "Request access to, correction of, or deletion of your personal data.",
  alternates: { canonical: "/data-request" },
};

export default function DataRequestPage() {
  return (
    <PageShell title="Data requests">
      <p>
        Under the Data Privacy Act of 2012 (RA 10173) you can ask to see,
        correct, or delete the personal data we hold about you. Send the
        request below and we reply within 15 working days.
      </p>

      <div className="my-4">
        <DataRequestForm />
      </div>

      <h2 className="font-display text-lg font-semibold text-foreground">
        What deletion actually does
      </h2>
      <p>
        Your account, profile, test attempts, course progress, and lead record
        are deleted outright. Credentials you earned are kept but unlinked from
        your account. A credential is a public statement we made about your
        competency at a point in time, and employers who checked your code have
        to keep getting an answer. The verification page keeps showing the
        holder name printed on the certificate; nothing ties it back to a login.
      </p>
      <p>
        If you want a credential itself withdrawn, say so in the request and
        we&apos;ll revoke it. The code then resolves as revoked rather than
        disappearing.
      </p>
      <p className="text-sm">
        You can also email{" "}
        <a
          href="mailto:gnclub.contactus@gmail.com"
          className="text-primary underline underline-offset-4"
        >
          gnclub.contactus@gmail.com
        </a>{" "}
        from your account address, or complain to the National Privacy
        Commission if you think we&apos;ve handled your data badly.
      </p>
    </PageShell>
  );
}
