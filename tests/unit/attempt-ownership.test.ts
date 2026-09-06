import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/anon", () => ({ getAnonId: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn() }));

import { getAnonId } from "@/lib/auth/anon";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteAttempt } from "@/lib/assessment/ownership";
import type { Attempt } from "@/lib/db/attempts";

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: "attempt-1",
    assessment_id: "assessment-1",
    user_id: null,
    anon_id: null,
    email: null,
    score: null,
    competency_scores: null,
    level: null,
    recommended_path: null,
    passed: null,
    answers: [],
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

describe("canWriteAttempt", () => {
  beforeEach(() => {
    vi.mocked(getAnonId).mockReset();
    vi.mocked(getSessionUser).mockReset();
  });

  it("allows the browser that holds the matching anon cookie", async () => {
    vi.mocked(getAnonId).mockResolvedValue("anon-abc");
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const a = attempt({ anon_id: "anon-abc" });
    expect(await canWriteAttempt(a)).toBe(true);
  });

  it("refuses a browser with a different anon cookie", async () => {
    vi.mocked(getAnonId).mockResolvedValue("anon-someone-else");
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const a = attempt({ anon_id: "anon-abc" });
    expect(await canWriteAttempt(a)).toBe(false);
  });

  it("allows the signed-in user the attempt belongs to", async () => {
    vi.mocked(getAnonId).mockResolvedValue(null);
    vi.mocked(getSessionUser).mockResolvedValue({
      uid: "user-1",
      email: "a@example.com",
    } as never);
    const a = attempt({ user_id: "user-1" });
    expect(await canWriteAttempt(a)).toBe(true);
  });

  it("refuses a signed-in user who does not own the attempt", async () => {
    vi.mocked(getAnonId).mockResolvedValue(null);
    vi.mocked(getSessionUser).mockResolvedValue({
      uid: "user-2",
      email: "b@example.com",
    } as never);
    const a = attempt({ user_id: "user-1" });
    expect(await canWriteAttempt(a)).toBe(false);
  });

  it("refuses an anonymous caller with no cookie against an anonymous attempt", async () => {
    vi.mocked(getAnonId).mockResolvedValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const a = attempt({ anon_id: "anon-abc" });
    expect(await canWriteAttempt(a)).toBe(false);
  });

  it("refuses everyone once an attempt has neither an anon id nor a user id", async () => {
    vi.mocked(getAnonId).mockResolvedValue("anon-abc");
    vi.mocked(getSessionUser).mockResolvedValue({
      uid: "user-1",
      email: "a@example.com",
    } as never);
    const a = attempt({ anon_id: null, user_id: null });
    expect(await canWriteAttempt(a)).toBe(false);
  });
});
