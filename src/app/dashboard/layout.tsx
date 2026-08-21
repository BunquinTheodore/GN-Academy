import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileById } from "@/lib/db/profiles";
import { listEnrollmentsForUser } from "@/lib/db/enrollments";
import { listCredentialsForUser } from "@/lib/db/credentials";
import { profileCompleteness } from "@/lib/dashboard/completeness";
import { SidebarNav, type IconKey } from "@/components/dashboard/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The signed-in shell.
 *
 * A learner's work here is spread across courses, quizzes, an assignment, a
 * credential and a public profile, and the old single-row header gave no sense
 * of where any of it stood. The sidebar is persistent and carries live state —
 * how complete the profile is, how many courses are running, how many
 * credentials exist — so the answer to "what should I do next" is visible from
 * every page rather than only from the dashboard.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Real security check — the middleware redirect is UX only.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const [profile, enrollments, credentials] = await Promise.all([
    getProfileById(user.uid).catch(() => null),
    listEnrollmentsForUser(user.uid).catch(() => []),
    listCredentialsForUser(user.uid).catch(() => []),
  ]);

  const activeCourses = enrollments.filter((e) =>
    ["active", "completed"].includes(e.status),
  ).length;

  const sections: {
    heading: string;
    items: {
      href: string;
      label: string;
      icon: IconKey;
      progress?: number | null;
      badge?: string | null;
      exact?: boolean;
    }[];
  }[] = [
    {
      heading: "Start",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
        {
          href: "/dashboard/profile",
          label: "Profile",
          icon: "profile",
          progress: profileCompleteness(profile),
        },
      ],
    },
    {
      heading: "Program",
      items: [
        {
          href: "/dashboard/courses",
          label: "My courses",
          icon: "courses",
          badge: activeCourses > 0 ? String(activeCourses) : null,
        },
        { href: "/dashboard/assessments", label: "Exams", icon: "assessments" },
        {
          href: "/dashboard/credentials",
          label: "Credentials",
          icon: "credentials",
          badge: credentials.length > 0 ? String(credentials.length) : null,
        },
        { href: "/certifications", label: "Browse courses", icon: "directory" },
      ],
    },
    {
      heading: "Connect",
      items: [
        { href: "/employers", label: "Talent directory", icon: "directory" },
        { href: "/verify", label: "Verify a credential", icon: "verify" },
        { href: "/blog", label: "Blog", icon: "blog" },
        { href: "/data-request", label: "Support & data", icon: "support" },
      ],
    },
  ];

  const displayName = profile?.full_name?.trim() || user.email || "Learner";

  return (
    <div className="flex min-h-svh bg-background">
      {/* Persistent rail on desktop. On mobile it collapses to the top bar
          below, because a 240px sidebar on a 360px screen is not navigation. */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/gn-academy-logo.png"
              alt=""
              width={512}
              height={512}
              className="size-7 rounded-md bg-black object-contain"
            />
            <span className="font-display text-base font-semibold">
              GN Academy
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <SidebarNav sections={sections} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md bg-background p-2.5">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="size-9 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-medium text-brand-foreground"
              >
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <SignOutButton />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Image
                src="/brand/gn-academy-logo.png"
                alt=""
                width={512}
                height={512}
                className="size-7 rounded-md bg-black object-contain"
              />
              <span className="font-display text-base font-semibold">
                GN Academy
              </span>
            </Link>
            {/* The toggle lives in the rail on desktop, and the rail is hidden
                here, so it has to be repeated. Without it there is no way to
                change the theme on a phone, which is the device most of these
                lessons are read on. */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <div className="-mx-0 overflow-x-auto border-t border-border px-2 pb-1">
            <div className="flex min-w-max gap-1 py-1">
              {sections
                .flatMap((s) => s.items)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex min-h-10 items-center rounded-md px-3 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
