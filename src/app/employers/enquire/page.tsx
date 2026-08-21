import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";
import { EnquiryForm } from "./enquiry-form";

export const metadata: Metadata = {
  title: "Hiring enquiry",
  description:
    "Tell us what you're hiring for and we'll point you at credential-holders who match.",
  alternates: { canonical: "/employers/enquire" },
};

export default async function EnquirePage({
  searchParams,
}: {
  searchParams: Promise<{ talent?: string }>;
}) {
  const talent = (await searchParams).talent?.slice(0, 30);

  return (
    <PageShell title="Hiring enquiry">
      <p>
        {talent
          ? `We'll pass this to ${talent} and to anyone else whose credentials match what you describe.`
          : "Tell us the role and we'll point you at the people who hold the right credential."}{" "}
        There&apos;s no fee and no account to create.
      </p>

      <div className="my-4">
        <EnquiryForm talent={talent} />
      </div>

      <p className="text-sm">
        We never sell contact details. Candidates are told who asked and decide
        for themselves whether to reply.
      </p>
    </PageShell>
  );
}
