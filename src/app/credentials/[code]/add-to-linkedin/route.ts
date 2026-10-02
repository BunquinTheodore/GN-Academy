import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCredentialByCode } from "@/lib/db/credentials";
import { env } from "@/lib/env";
import { decideAddToProfile } from "@/lib/linkedin/add-to-profile";

export const dynamic = "force-dynamic";

const PLAIN_TEXT = { "content-type": "text/plain; charset=utf-8" } as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const user = await getSessionUser();

  // Signed-out visitors are sent to log in before any lookup happens.
  const credential = user
    ? await getCredentialByCode(code).catch(() => null)
    : null;

  const decision = decideAddToProfile({
    code,
    sessionUid: user?.uid ?? null,
    credential,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    organizationId: env.NEXT_PUBLIC_LINKEDIN_ORG_ID,
    now: new Date(),
  });

  switch (decision.kind) {
    case "login":
      return NextResponse.redirect(new URL(decision.location, env.NEXT_PUBLIC_SITE_URL), 302);
    case "redirect":
      return NextResponse.redirect(decision.location, 302);
    case "gone":
      return new NextResponse(decision.message, { status: 410, headers: PLAIN_TEXT });
    case "not-found":
      return new NextResponse("Not found", { status: 404, headers: PLAIN_TEXT });
  }
}
