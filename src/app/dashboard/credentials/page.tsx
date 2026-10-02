import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listCredentialsForUser } from "@/lib/db/credentials";
import { CredentialCard } from "@/components/credential-card";
import { CertificateViewer } from "@/components/certificate-3d/certificate-viewer";
import { LinkedInShareButton } from "@/components/linkedin-share-dialog";
import { env } from "@/lib/env";
import { addToLinkedInPath } from "@/lib/linkedin/add-to-profile";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My credentials" };

export default async function CredentialsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/credentials");

  const credentials = await listCredentialsForUser(user.uid).catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My credentials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each one has a public verification page. Put the code on your CV
          and let employers check it themselves.
        </p>
      </div>

      {credentials.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-8">
          <p className="text-muted-foreground">
            No credentials yet. Finish a course and pass its exam. The free
            AI Foundations track is the fastest first one.
          </p>
          <Button asChild>
            <Link href="/certifications">Browse certifications</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {credentials.map((credential) => (
            <div key={credential.id} className="flex flex-col items-start gap-3">
              {credential.status === "active" ? (
                <CertificateViewer
                  holderName={credential.holder_name}
                  title={credential.title}
                  level={credential.level ?? undefined}
                  credentialCode={credential.credential_code}
                  issuedAt={credential.issued_at}
                  verifyUrl={`${env.NEXT_PUBLIC_SITE_URL}/verify/${credential.credential_code}`}
                />
              ) : (
                <CredentialCard
                  state="earned"
                  holderName={credential.holder_name}
                  title={credential.title}
                  level={credential.level ?? undefined}
                  credentialCode={credential.credential_code}
                  issuedAt={credential.issued_at}
                />
              )}
              <div className="flex flex-wrap gap-2">
                {credential.status === "active" && (
                  <LinkedInShareButton
                    size="sm"
                    credential={{
                      title: credential.title,
                      credentialCode: credential.credential_code,
                      issuedAt: credential.issued_at,
                      siteUrl: env.NEXT_PUBLIC_SITE_URL,
                    }}
                  />
                )}
                {credential.status === "active" && (
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={addToLinkedInPath(credential.credential_code)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Plus aria-hidden />
                      Add to LinkedIn profile
                    </a>
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/verify/${credential.credential_code}`}>
                    Public page
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`/api/credentials/${credential.credential_code}/pdf`}
                    download
                  >
                    Download PDF
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
