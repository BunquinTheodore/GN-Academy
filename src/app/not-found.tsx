import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="font-display text-2xl font-semibold">
        That page doesn&apos;t exist
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may be old or mistyped. The homepage has everything that does
        exist.
      </p>
      <Button asChild>
        <Link href="/">Go to the homepage</Link>
      </Button>
    </div>
  );
}
