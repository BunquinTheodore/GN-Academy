import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://gnacademy.test" },
}));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: vi.fn() }));
vi.mock("@/lib/db/credentials", () => ({
  getCredentialForUserAndCertification: vi.fn(),
  issueCredential: vi.fn(),
}));
vi.mock("@/lib/db/enrollments", () => ({
  getEnrollment: vi.fn(),
  markEnrollmentCompleted: vi.fn(),
}));
vi.mock("@/lib/db/assignments", () => ({
  getAssignmentForCertification: vi.fn(),
  getSubmission: vi.fn(),
}));
vi.mock("@/lib/db/profiles", () => ({ getProfileById: vi.fn() }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/credential-issued", () => ({
  CredentialIssuedEmail: vi.fn(),
}));

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCredentialForUserAndCertification,
  issueCredential,
} from "@/lib/db/credentials";
import { getEnrollment, markEnrollmentCompleted } from "@/lib/db/enrollments";
import {
  getAssignmentForCertification,
  getSubmission,
} from "@/lib/db/assignments";
import { getProfileById } from "@/lib/db/profiles";
import { sendEmail } from "@/lib/email/send";
import { maybeIssueCredential } from "@/lib/credentials/issue";

/**
 * A minimal stand-in for the Supabase query builder. `issue.ts` uses
 * `supabaseAdmin()` directly for three reads: the certification row
 * (`.maybeSingle()`), the published final exams for a certification (an
 * awaited list), and passing attempts against those exams (also an awaited
 * list). Each table gets a queue of canned responses so a test can shape
 * exactly what each successive call to the same table returns.
 */
function makeAdmin(queues: Record<string, { data: unknown; error: unknown }[]>) {
  return {
    from(table: string) {
      const queue = queues[table] ?? [];
      const result =
        queue.length > 1 ? queue.shift()! : (queue[0] ?? { data: null, error: null });
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        is: () => builder,
        not: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (v: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve),
      };
      return builder;
    },
  } as unknown as ReturnType<typeof supabaseAdmin>;
}

const CERT_EXAM = {
  id: "cert-1",
  requires_assignment: false,
  credential_prefix: "TST",
  title: "Test Certification",
  level: "foundation",
};

const CERT_ASSIGNMENT = { ...CERT_EXAM, requires_assignment: true };

const ACTIVE_ENROLLMENT = {
  id: "enr-1",
  user_id: "user-1",
  certification_id: "cert-1",
  status: "active" as const,
  progress_percent: 100,
  payment_method: null,
  payment_ref: null,
  amount_paid_php: null,
  enrolled_at: "2026-01-01T00:00:00.000Z",
  approved_at: null,
  completed_at: null,
};

const CREDENTIAL = {
  id: "cred-1",
  credential_code: "TST-2026-000001",
  user_id: "user-1",
  certification_id: "cert-1",
  holder_name: "Test Learner",
  title: "Test Certification",
  level: "foundation",
  issued_at: "2026-01-01T00:00:00.000Z",
  expires_at: null,
  status: "active" as const,
  competencies: null,
  pdf_url: null,
  revoked_reason: null,
  revoked_at: null,
};

describe("maybeIssueCredential", () => {
  beforeEach(() => {
    vi.mocked(getCredentialForUserAndCertification).mockReset().mockResolvedValue(null);
    vi.mocked(issueCredential).mockReset().mockResolvedValue(CREDENTIAL);
    vi.mocked(getEnrollment).mockReset().mockResolvedValue(ACTIVE_ENROLLMENT);
    vi.mocked(markEnrollmentCompleted).mockReset().mockResolvedValue(undefined);
    vi.mocked(getAssignmentForCertification).mockReset().mockResolvedValue(null);
    vi.mocked(getSubmission).mockReset().mockResolvedValue(null);
    vi.mocked(getProfileById)
      .mockReset()
      .mockResolvedValue({ full_name: "Test Learner", email: "learner@example.com" } as never);
    vi.mocked(sendEmail).mockReset().mockResolvedValue(undefined as never);
  });

  it("is blocked when the certification does not exist", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({ certifications: [{ data: null, error: null }] }),
    );
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "missing",
    });
    expect(outcome).toEqual({ status: "blocked", reason: "no-certification" });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("returns the existing credential instead of issuing a second one", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({ certifications: [{ data: CERT_EXAM, error: null }] }),
    );
    vi.mocked(getCredentialForUserAndCertification).mockResolvedValue(CREDENTIAL);
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
    });
    expect(outcome).toEqual({ status: "already", credential: CREDENTIAL });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("is blocked when there is no active or completed enrollment", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({ certifications: [{ data: CERT_EXAM, error: null }] }),
    );
    vi.mocked(getEnrollment).mockResolvedValue(null);
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
    });
    expect(outcome).toEqual({ status: "blocked", reason: "not-enrolled" });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("exam course: blocked when no final exam is published", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({
        certifications: [{ data: CERT_EXAM, error: null }],
        assessments: [{ data: [], error: null }],
      }),
    );
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
    });
    expect(outcome).toEqual({ status: "blocked", reason: "exam-not-passed" });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("exam course: blocked when the learner has no passing attempt", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({
        certifications: [{ data: CERT_EXAM, error: null }],
        assessments: [{ data: [{ id: "exam-1" }], error: null }],
        attempts: [{ data: [], error: null }],
      }),
    );
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
    });
    expect(outcome).toEqual({ status: "blocked", reason: "exam-not-passed" });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("exam course: issues the credential and emails the holder on a passing attempt", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({
        certifications: [{ data: CERT_EXAM, error: null }],
        assessments: [
          { data: [{ id: "exam-1" }], error: null }, // published final exams
          { data: [], error: null }, // competenciesFromAttempts: no assessments needed (competencies supplied)
        ],
        attempts: [{ data: [{ id: "attempt-1" }], error: null }],
      }),
    );
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
      competencies: [],
    });
    expect(outcome).toEqual({ status: "issued", credential: CREDENTIAL });
    expect(issueCredential).toHaveBeenCalledTimes(1);
    expect(markEnrollmentCompleted).toHaveBeenCalledWith("user-1", "cert-1");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("assignment course: blocked when there is no published assignment", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({ certifications: [{ data: CERT_ASSIGNMENT, error: null }] }),
    );
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
    });
    expect(outcome).toEqual({
      status: "blocked",
      reason: "assignment-not-approved",
    });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("assignment course: blocked when the submission is not approved", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({ certifications: [{ data: CERT_ASSIGNMENT, error: null }] }),
    );
    vi.mocked(getAssignmentForCertification).mockResolvedValue({
      id: "asg-1",
      certification_id: "cert-1",
      title: "Final project",
      brief_mdx: "",
      criteria: [],
      min_words: 0,
      is_published: true,
    });
    vi.mocked(getSubmission).mockResolvedValue({
      id: "sub-1",
      assignment_id: "asg-1",
      user_id: "user-1",
      content: "",
      link_url: null,
      status: "changes_requested",
      attempt_count: 1,
      reviewer_note: "Needs more detail.",
      reviewed_by: "admin-1",
      reviewed_at: "2026-01-01T00:00:00.000Z",
      submitted_at: "2026-01-01T00:00:00.000Z",
    });
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
    });
    expect(outcome).toEqual({
      status: "blocked",
      reason: "assignment-not-approved",
    });
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("assignment course: issues the credential once a submission is approved", async () => {
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({
        certifications: [{ data: CERT_ASSIGNMENT, error: null }],
        assessments: [{ data: [], error: null }],
      }),
    );
    vi.mocked(getAssignmentForCertification).mockResolvedValue({
      id: "asg-1",
      certification_id: "cert-1",
      title: "Final project",
      brief_mdx: "",
      criteria: [],
      min_words: 0,
      is_published: true,
    });
    vi.mocked(getSubmission).mockResolvedValue({
      id: "sub-1",
      assignment_id: "asg-1",
      user_id: "user-1",
      content: "",
      link_url: null,
      status: "approved",
      attempt_count: 1,
      reviewer_note: null,
      reviewed_by: "admin-1",
      reviewed_at: "2026-01-01T00:00:00.000Z",
      submitted_at: "2026-01-01T00:00:00.000Z",
    });
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
      competencies: [],
    });
    expect(outcome).toEqual({ status: "issued", credential: CREDENTIAL });
    expect(issueCredential).toHaveBeenCalledTimes(1);
  });

  it("re-checks every prerequisite from the database rather than trusting the caller", async () => {
    // Calling with competencies supplied must not skip the enrollment,
    // exam-pass, or existing-credential checks — the whole point of this
    // function is that nothing upstream can be trusted.
    vi.mocked(supabaseAdmin).mockReturnValue(
      makeAdmin({ certifications: [{ data: CERT_EXAM, error: null }] }),
    );
    vi.mocked(getEnrollment).mockResolvedValue(null);
    const outcome = await maybeIssueCredential({
      userId: "user-1",
      certificationId: "cert-1",
      competencies: [{ key: "prompting", label: "x", weight: 25, correct: 4, total: 4, score: 100 }],
    });
    expect(outcome.status).toBe("blocked");
    expect(issueCredential).not.toHaveBeenCalled();
  });
});
