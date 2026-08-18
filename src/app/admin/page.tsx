import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">Admin</h1>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/enrollments">Pending enrollments</Link>
        </Button>
      </div>
      {/* TODO(phase-4): certifications, lessons, questions, credentials, leads CSV */}
      <p className="max-w-prose text-sm text-muted-foreground">
        Content editing, question management, credential revocation, and lead
        export arrive with the admin phase.
      </p>
    </div>
  );
}
