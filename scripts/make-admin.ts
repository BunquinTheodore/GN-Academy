/**
 * Promote a user to admin (§6.6). Run after they have signed up once:
 *
 *   npx tsx scripts/make-admin.ts someone@example.com
 *
 * Sets the `admin: true` custom claim (what /admin actually checks) and
 * profiles.role = 'admin' (for display/queries). The user must sign out and
 * back in — or wait up to an hour for token refresh — before /admin opens.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes("@")) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const required = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars in .env.local: ${missing.join(", ")}`);
    process.exit(1);
  }

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });

  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error(
      `No Firebase user found for ${email}. They must sign up first.`,
    );
    process.exit(1);
  }

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    role: "authenticated",
    admin: true,
  });
  console.log(`Custom claim admin:true set for ${email} (${user.uid}).`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.uid);
  if (error) {
    console.error(`Claim set, but profiles.role update failed: ${error.message}`);
    process.exit(1);
  }
  console.log("profiles.role = 'admin' set.");
  console.log("Done. The user must sign out and back in to pick up the claim.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
