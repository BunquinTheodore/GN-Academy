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
          <Link href="/admin/certifications">Certifications</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/questions">Question sets</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/enrollments">Pending enrollments</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/credentials">Credentials</Link>
        </Button>
      </div>
      {/* TODO(phase-4): leads CSV, blog, data requests */}
    </div>
  );
}
