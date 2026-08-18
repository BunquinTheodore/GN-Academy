import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-semibold">Your profile</h1>
      {/* TODO(phase-5): full profile editor with avatar upload */}
      <p className="max-w-prose text-sm text-muted-foreground">
        Profile editing is on its way. Your name and email are already saved
        from sign-up — headline, skills, and portfolio come with the talent
        profile update.
      </p>
    </div>
  );
}
