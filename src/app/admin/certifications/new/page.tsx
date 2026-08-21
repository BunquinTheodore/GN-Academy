import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-form";
import { CertificationFields } from "../certification-fields";
import { saveCertificationAction } from "../actions";

export const metadata: Metadata = {
  title: "New certification",
  robots: { index: false, follow: false },
};

export default function NewCertificationPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/certifications"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Certifications
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">
          New certification
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save it as a draft first. Modules, lessons, and the exam are added
          on the next screen. Publish when it&apos;s ready to sell.
        </p>
      </div>

      <AdminForm action={saveCertificationAction} submitLabel="Create">
        <CertificationFields />
      </AdminForm>
    </div>
  );
}
