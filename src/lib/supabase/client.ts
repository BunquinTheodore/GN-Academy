"use client";

import { createClient } from "@supabase/supabase-js";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";
import { env } from "@/lib/env";

/**
 * Browser Supabase client authenticated with the Firebase ID token.
 * Requires Firebase to be registered under Supabase → Authentication →
 * Third Party Auth, and the JWT to carry `role: "authenticated"` (set by
 * POST /api/auth/sync on first sign-in).
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    accessToken: async () => {
      const user = getAuth(firebaseApp).currentUser;
      return user ? await user.getIdToken() : null;
    },
  },
);
