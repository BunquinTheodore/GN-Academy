import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Purges cached public pages after an admin edit.
 *
 * The obvious home for this is the server action that made the edit, and
 * that is where it used to live. It cannot: a server action that calls
 * `revalidatePath` and returns state to `useActionState` never finishes its
 * transition in a production build, so the editor's form hangs on a disabled
 * "Saving…" button even though the write landed. A route handler has no
 * transition to hang, so the purge happens here instead — fired by
 * `AdminForm` once the save has already succeeded.
 *
 * Admin-only, and it 404s for everyone else for the same reason /admin does:
 * a 403 would confirm the endpoint exists.
 */
const schema = z.object({
  paths: z
    .array(
      z
        .string()
        .max(300)
        // Same-origin absolute pathnames only. Never a URL, never a traversal.
        .regex(/^\/[A-Za-z0-9\-._~/]*$/, "Not a site path."),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  for (const path of parsed.data.paths) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: parsed.data.paths.length });
}
