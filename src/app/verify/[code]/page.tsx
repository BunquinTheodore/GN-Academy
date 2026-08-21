import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldX } from "lucide-react";
import { getCredentialByCode, type Credential } from "@/lib/db/credentials";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { CredentialCard } from "@/components/credential-card";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { TrackView } from "@/components/track-view";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const credential = await getCredentialByCode(code).catch(() => null);
  if (!credential) {
    return { title: "Credential not found", robots: { index: false } };
  }
  return {
    title: `${credential.credential_code} · ${credential.title}`,
    description: `Verified GN Academy credential: ${credential.holder_name}, ${credential.title}. Issued ${formatDate(credential.issued_at)}.`,
    alternates: { canonical: `/verify/${credential.credential_code}` },
  };
}

function NotFoundState({ code }: { code: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <ShieldX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="font-display text-2xl font-semibold">
        No credential found
      </h1>
      <p className="text-muted-foreground">
        Nothing matches{" "}
        <span className="font-mono text-foreground">{code.toUpperCase().slice(0, 40)}</span>.
        Check for typos. Codes look like{" "}
        <span className="font-mono">CAVA-2026-001248</span>. If someone showed
        you this code as proof of certification, treat that claim with
        caution.
      </p>
      <Button asChild variant="outline">
        <Link href="/verify">Try another code</Link>
      </Button>
    </div>
  );
}

export default async function VerifyCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const credential: Credential | null = await getCredentialByCode(code).catch(
    () => null,
  );

  const jsonLd = credential
    ? {
        "@context": "https://schema.org",
        "@type": "EducationalOccupationalCredential",
        name: credential.title,
        credentialCategory: "certification",
        recognizedBy: {
          "@type": "Organization",
          name: "GN Academy",
          url: env.NEXT_PUBLIC_SITE_URL,
        },
        dateCreated: credential.issued_at,
        identifier: credential.credential_code,
      }
    : null;

  const isDemo = credential?.holder_name.includes("(Demo Record)") ?? false;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {credential && (
        <TrackView
          event="credential_verified"
          props={{ status: credential.status }}
        />
      )}

      {!credential ? (
        <NotFoundState code={code} />
      ) : (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
          <div className="flex items-center gap-2">
            {credential.status === "active" ? (
              <>
                <BadgeCheck className="size-5 text-verified-text" aria-hidden />
                <p className="text-sm font-semibold tracking-wider text-verified-text uppercase">
                  Verified credential
                </p>
              </>
            ) : (
              <>
                <ShieldX className="size-5 text-destructive" aria-hidden />
                <p className="text-sm font-semibold tracking-wider text-destructive uppercase">
                  {credential.status === "revoked"
                    ? "Revoked credential"
                    : "Expired credential"}
                </p>
              </>
            )}
          </div>

          {isDemo && (
            <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              This is a demonstration record with a fictional holder, published
              so you can see what verification looks like.
            </p>
          )}

          {credential.status === "revoked" && (
            <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              This credential was revoked
              {credential.revoked_at && ` on ${formatDate(credential.revoked_at)}`}
              {credential.revoked_reason && `: ${credential.revoked_reason}`}. It
              should not be relied on as proof of certification.
            </p>
          )}

          <div className="mt-6">
            <CredentialCard
              state={credential.status === "active" ? "verified" : "earned"}
              holderName={credential.holder_name}
              title={credential.title}
              level={
                credential.level
                  ? `${credential.level[0].toUpperCase()}${credential.level.slice(1)} certification`
                  : undefined
              }
              credentialCode={credential.credential_code}
              issuedAt={credential.issued_at}
              className="max-w-full"
            />
          </div>

          {credential.competencies && credential.competencies.length > 0 && (
            <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Assessed competencies</h2>
              {credential.competencies.map((c) => (
                <div key={c.key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{c.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {c.score}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`${c.label}: ${c.score} out of 100`}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-verified"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Issued {formatDate(credential.issued_at)} · Code{" "}
              <span className="font-mono text-foreground">
                {credential.credential_code}
              </span>
            </p>
            <p>
              This page is the authoritative record for this credential,
              published by GN Academy. Codes are permanent and never reused.
            </p>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Hiring? You can check every GN Academy credential like this one
              in seconds, no account needed.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/employers">Hire verified talent</Link>
            </Button>
          </div>
        </main>
      )}
      <SiteFooter />
    </div>
  );
}
