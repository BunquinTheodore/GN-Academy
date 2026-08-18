import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // §6.6: admin access is decided by the custom claim, verified server-side.
  // notFound (not redirect) so the admin area's existence isn't advertised.
  const user = await getSessionUser();
  if (!user?.admin) notFound();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="font-display text-lg font-semibold">
            GN Academy <span className="text-muted-foreground">/ admin</span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
