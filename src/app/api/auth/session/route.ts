import { z } from "zod";
import {
  clearSessionCookie,
  createSessionCookie,
} from "@/lib/auth/session";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const bodySchema = z.object({ idToken: z.string().min(1) });

/** Exchanges a Firebase ID token for an httpOnly session cookie (§6.5). */
export async function POST(request: Request) {
  if (!(await checkRateLimit(request, RATE_LIMITS.auth))) {
    return rateLimitedResponse();
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    await createSessionCookie(parsed.data.idToken);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Sign-in could not be completed. Try again." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
