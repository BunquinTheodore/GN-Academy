import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { serverEnv } from "@/lib/env.server";

/**
 * Lazily initialised so that importing this module (e.g. during `next build`
 * prerendering) never touches the credential — only an actual auth operation
 * does.
 */
let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  app = initializeApp({
    credential: cert({
      projectId: serverEnv.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: serverEnv.FIREBASE_ADMIN_PRIVATE_KEY,
    }),
  });
  return app;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
