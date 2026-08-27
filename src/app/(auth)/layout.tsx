import Link from "next/link";
import { AuthTopBar } from "./auth-top-bar";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-6 sm:px-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight"
        >
          GN Academy
        </Link>
        <AuthTopBar />
      </header>
      {/* Width is each page's own call — login/forgot-password stay narrow,
          signup's two-column layout needs the room. */}
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:pb-24">
        {children}
      </main>
    </div>
  );
}
