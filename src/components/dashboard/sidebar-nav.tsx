"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutGrid,
  LifeBuoy,
  Newspaper,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  /** A percentage shown as a pill, when the section has a measurable state. */
  progress?: number | null;
  badge?: string | null;
  exact?: boolean;
};

export type SidebarSection = {
  heading: string;
  items: Item[];
};

const ICONS = {
  dashboard: LayoutGrid,
  profile: UserRound,
  courses: BookOpen,
  assignments: ClipboardCheck,
  credentials: Award,
  assessments: GraduationCap,
  directory: Users,
  verify: ShieldCheck,
  blog: Newspaper,
  support: LifeBuoy,
} as const;

export type IconKey = keyof typeof ICONS;

export function SidebarNav({
  sections,
}: {
  sections: {
    heading: string;
    items: {
      href: string;
      label: string;
      icon: IconKey;
      progress?: number | null;
      badge?: string | null;
      exact?: boolean;
    }[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.heading}>
          <p className="px-3 text-[0.6875rem] font-medium tracking-widest text-muted-foreground/70 uppercase">
            {section.heading}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active && "text-primary",
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{item.label}</span>

                    {typeof item.progress === "number" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[0.6875rem]",
                          item.progress >= 100
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.progress}%
                      </span>
                    )}

                    {item.badge && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] font-medium text-brand-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
