import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileById } from "@/lib/db/profiles";
import {
  countActiveCredentials,
  listPortfolioForUser,
} from "@/lib/db/talent";
import { AVATAR_BUCKET } from "@/lib/storage";
import { AdminForm } from "@/components/admin/admin-form";
import {
  CheckboxField,
  ListField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/field";
import { ImageUpload } from "@/components/image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveProfileAction } from "./actions";
import { PortfolioEditor } from "./portfolio-editor";

export const metadata: Metadata = { title: "Your profile" };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/profile");

  const [profile, portfolio, credentialCount] = await Promise.all([
    getProfileById(user.uid).catch(() => null),
    listPortfolioForUser(user.uid).catch(() => []),
    countActiveCredentials(user.uid).catch(() => 0),
  ]);

  const nextPortfolioOrder =
    portfolio.reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what employers see when they open your talent page. Your
          credentials are attached automatically — you can&apos;t edit those,
          which is exactly why they&apos;re worth something.
        </p>
      </div>

      {credentialCount === 0 ? (
        <Alert>
          <AlertDescription>
            Your profile stays private until you hold an active credential.
            Fill it in now and it goes live the day you pass.{" "}
            <Link
              href="/certifications"
              className="font-medium underline underline-offset-4"
            >
              Browse certifications
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        profile?.is_public &&
        profile.username && (
          <Alert>
            <AlertDescription>
              Live at{" "}
              <Link
                href={`/talent/${profile.username}`}
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
              >
                /talent/{profile.username}
                <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            </AlertDescription>
          </Alert>
        )
      )}

      <section>
        <h2 className="font-display text-lg font-semibold">Details</h2>
        <div className="mt-4">
          <AdminForm action={saveProfileAction}>
            <TextField
              name="full_name"
              label="Full name"
              defaultValue={profile?.full_name}
              hint="Shown on your profile and printed on your certificates."
            />

            <TextField
              name="username"
              label="Username"
              defaultValue={profile?.username}
              placeholder="juana-cruz"
              hint="Your public address: /talent/your-username. Lowercase letters, numbers, and hyphens."
            />

            <TextField
              name="headline"
              label="Headline"
              defaultValue={profile?.headline}
              placeholder="AI-assisted VA for e-commerce founders"
              hint="One line. What you do and who for — not a job title."
            />

            <TextAreaField
              name="bio"
              label="About"
              rows={6}
              defaultValue={profile?.bio}
              hint="A few sentences. Concrete work beats adjectives."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="location"
                label="Location"
                defaultValue={profile?.location ?? "Philippines"}
              />
              <SelectField
                name="situation"
                label="Current situation"
                defaultValue={profile?.situation ?? ""}
                options={[
                  { value: "", label: "Prefer not to say" },
                  { value: "student", label: "Student" },
                  { value: "jobseeker", label: "Looking for work" },
                  { value: "freelancer", label: "Freelancing" },
                  { value: "employed", label: "Employed" },
                ]}
              />
            </div>

            <ListField
              name="skills"
              label="Skills"
              defaultValue={profile?.skills}
              rows={5}
              hint="One per line, up to 20. These become the employer directory's filters."
            />

            <ImageUpload
              bucket={AVATAR_BUCKET}
              name="avatar_path"
              label="Photo"
              maxWidthOrHeight={512}
              defaultUrl={profile?.avatar_url}
              hint="Optional. Compressed on your phone before uploading, so it won't eat your data."
            />

            <div className="rounded-lg border border-border p-4">
              <CheckboxField
                name="is_public"
                label="List me in the employer directory"
                defaultChecked={profile?.is_public}
                hint="Turning this off removes your profile and portfolio from public view immediately. Credentials stay verifiable by code either way."
              />
            </div>
          </AdminForm>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Portfolio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Three or four real pieces beat a long list. A screenshot of work you
          actually did is worth more than a description of work you could do.
        </p>
        <div className="mt-4">
          <PortfolioEditor
            items={portfolio}
            nextSortOrder={nextPortfolioOrder}
          />
        </div>
      </section>
    </div>
  );
}
