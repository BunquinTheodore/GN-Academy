import { z } from "zod";
import { getCredentialByCode } from "@/lib/db/credentials";
import { renderCertificatePdf } from "@/lib/pdf/certificate";
import { env } from "@/lib/env";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const paramsSchema = z.object({ code: z.string().min(4).max(40) });

/**
 * Certificate PDF generated on demand from the credential record — no stored
 * files, no storage egress, always reflects current status. Public like the
 * verification page itself.
 *
 * The page itself is drawn in src/lib/pdf/certificate.ts, which needs no
 * database and so can be tested.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  if (!(await checkRateLimit(request, RATE_LIMITS.verifyLookup))) {
    return rateLimitedResponse();
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return Response.json({ error: "Invalid credential code." }, { status: 400 });
  }

  const credential = await getCredentialByCode(params.data.code).catch(
    () => null,
  );
  if (!credential) {
    return Response.json({ error: "No credential found." }, { status: 404 });
  }
  if (credential.status !== "active") {
    return Response.json(
      { error: `This credential is ${credential.status}; its certificate is not available.` },
      { status: 410 },
    );
  }

  const host = env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "");
  const bytes = await renderCertificatePdf({
    holderName: credential.holder_name,
    title: credential.title,
    credentialCode: credential.credential_code,
    issuedAt: credential.issued_at,
    verifyLabel: `${host}/verify/${credential.credential_code}`,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${credential.credential_code}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
