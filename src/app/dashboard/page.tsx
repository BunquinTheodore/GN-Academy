import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileById, type Profile } from "@/lib/db/profiles";
import { CredentialCard } from "@/components/credential-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

type ChecklistItem = { label: string; done: boolean };

function profileChecklist(profile: Profile | null): ChecklistItem[] {
  return [
    { label: "Add your full name", done: !!profile?.full_name },
    { label: "Choose a username", done: !!profile?.username },
    { label: "Write a headline", done: !!profile?.headline },
    { label: "Add a profile photo", done: !!profile?.avatar_url },
    { label: "Pick your career path", done: !!profile?.career_path },
    { label: "List at least 3 skills", done: (profile?.skills.length ?? 0) >= 3 },
  ];
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  let profile: Profile | null = null;
  let profileError = false;
  try {
    profile = await getProfileById(user.uid);
  } catch {
    profileError = true;
  }

  const checklist = profileChecklist(profile);
  const doneCount = checklist.filter((i) => i.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your talent profile is what employers will see. Finish it, then earn
          the credential that unlocks it.
        </p>
      </div>

      {profileError && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm">
              We couldn&apos;t load your profile right now. Refresh the page —
              if it keeps happening, your account sync may still be running.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline justify-between gap-4 text-base">
              <span>Your talent profile</span>
              <span className="font-mono text-sm text-muted-foreground">
                {percent}% complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={percent} aria-label={`Profile ${percent}% complete`} />
            <ul className="flex flex-col gap-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : (
                    <X className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  <span className={item.done ? "" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm">
                <X className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-muted-foreground">
                  Verified certification — required to appear in employer search
                </span>
              </li>
            </ul>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/profile">Edit profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-start gap-3">
          <CredentialCard
            state="goal"
            holderName={profile?.full_name ?? "Your name here"}
            title="Certified AI Virtual Assistant"
            level="Professional certification"
          />
          <Button asChild size="sm">
            <Link href="/certifications">Browse certifications</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
