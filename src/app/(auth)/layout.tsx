import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex justify-center px-4 py-6">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight"
        >
          GN Academy
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:pb-24">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
