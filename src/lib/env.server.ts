import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  IP_HASH_SALT: z.string().min(1),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Missing or invalid server environment variables:\n${parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n")}\nCopy .env.example to .env.local and fill in the values.`,
  );
}

export const serverEnv = {
  ...parsed.data,
  // .env files store the PEM as one line with literal \n sequences.
  FIREBASE_ADMIN_PRIVATE_KEY: parsed.data.FIREBASE_ADMIN_PRIVATE_KEY.replace(
    /\\n/g,
    "\n",
  ),
};
