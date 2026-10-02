import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  FIREBASE_ADMIN_PROJECT_ID: "p",
  FIREBASE_ADMIN_CLIENT_EMAIL: "a@b.co",
  FIREBASE_ADMIN_PRIVATE_KEY: "key",
  SUPABASE_SERVICE_ROLE_KEY: "svc",
  RESEND_API_KEY: "re",
  IP_HASH_SALT: "salt",
};

async function loadWith(secret: string | undefined) {
  vi.resetModules();
  for (const [k, v] of Object.entries(BASE_ENV)) vi.stubEnv(k, v);
  if (secret === undefined) vi.stubEnv("ANCHOR_CRON_SECRET", undefined as never);
  else vi.stubEnv("ANCHOR_CRON_SECRET", secret);
  return (await import("@/lib/env.server")).serverEnv;
}

describe("serverEnv ANCHOR_CRON_SECRET", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("does not crash on a blank value and treats it as unset", async () => {
    expect((await loadWith("")).ANCHOR_CRON_SECRET).toBeUndefined();
  });

  it("does not crash on a too-short secret and treats it as unset", async () => {
    expect((await loadWith("short")).ANCHOR_CRON_SECRET).toBeUndefined();
  });

  it("does not crash when absent", async () => {
    expect((await loadWith(undefined)).ANCHOR_CRON_SECRET).toBeUndefined();
  });

  it("keeps a valid secret", async () => {
    const secret = "x".repeat(40);
    expect((await loadWith(secret)).ANCHOR_CRON_SECRET).toBe(secret);
  });
});
