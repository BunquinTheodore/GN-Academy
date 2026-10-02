import { z } from "zod";

import { loadProofBundle } from "@/lib/anchor/load";
import { getCredentialByCode } from "@/lib/db/credentials";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const paramsSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/),
});

const NOT_FOUND = { error: "No anchored credential found." };

/**
 * Public proof for one anchored credential: the payload, its salt, the Merkle
 * path and the OpenTimestamps file, so anyone can check it against Bitcoin with
 * standard tools and without trusting this site. The salt is released here
 * deliberately; the payload is already public on /verify/[code].
 *
 * Unknown, malformed, pending, skipped and expired credentials all answer the
 * same 404, and a database failure answers 503. It never answers 500 for a
 * code that does not exist.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  if (!(await checkRateLimit(request, RATE_LIMITS.proofLookup))) {
    return rateLimitedResponse();
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return Response.json(NOT_FOUND, { status: 404 });

  try {
    const credential = await getCredentialByCode(params.data.code);
    if (!credential) return Response.json(NOT_FOUND, { status: 404 });

    const bundle = await loadProofBundle(credential);
    if (!bundle) return Response.json(NOT_FOUND, { status: 404 });

    return Response.json(bundle, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (e) {
    console.error("proof lookup failed", e);
    return Response.json(
      { error: "Proof is temporarily unavailable." },
      { status: 503 },
    );
  }
}
