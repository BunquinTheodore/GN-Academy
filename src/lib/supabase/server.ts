import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Service-role client. Bypasses RLS — admin operations and trusted server
 * mutations only. Must never be imported from client code (`server-only`
 * enforces that at build time).
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
