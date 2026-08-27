import { cn } from "@/lib/utils";

export function AuthCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuthEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-widest text-primary uppercase">
      {children}
    </p>
  );
}
