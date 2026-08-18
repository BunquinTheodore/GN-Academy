import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-semibold">Admin</h1>
      {/* TODO(phase-4): certifications, lessons, questions, credentials, enrollments, leads */}
      <p className="max-w-prose text-sm text-muted-foreground">
        Admin tools land phase by phase: leads and questions with the funnel,
        enrollments and credentials with certification launch.
      </p>
    </div>
  );
}
