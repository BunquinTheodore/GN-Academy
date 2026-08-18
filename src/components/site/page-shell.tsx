import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export function PageShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <div className="mt-6 flex flex-col gap-4 text-muted-foreground">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
