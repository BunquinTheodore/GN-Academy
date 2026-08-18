import Link from "next/link";
import { footer, site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <p className="font-display text-lg font-semibold">{site.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">{footer.blurb}</p>
          </div>
          {footer.columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className="text-sm font-semibold">{col.heading}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          {footer.legalLine}
        </p>
      </div>
    </footer>
  );
}
