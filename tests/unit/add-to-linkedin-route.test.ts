import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getSessionUser: async () => null }));
vi.mock("@/lib/db/credentials", () => ({ getCredentialByCode: async () => null }));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://gnacademy.test",
    NEXT_PUBLIC_LINKEDIN_ORG_ID: undefined,
  },
}));

import { GET } from "@/app/credentials/[code]/add-to-linkedin/route";

describe("add-to-linkedin route", () => {
  it("builds the login redirect from the configured site URL, not the request host", async () => {
    const request = new Request("http://evil.example/credentials/A-1/add-to-linkedin");
    const response = await GET(request as never, {
      params: Promise.resolve({ code: "A-1" }),
    });
    expect(response.status).toBe(302);
    const location = response.headers.get("location")!;
    expect(new URL(location).origin).toBe("https://gnacademy.test");
    expect(location).toContain("/login?next=");
  });
});
