import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Real security check — the middleware redirect is UX only.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight"
          >
            GN Academy
          </Link>
          <nav aria-label="Dashboard" className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
