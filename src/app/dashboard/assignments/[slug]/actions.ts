"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import type { AdminFormState } from "@/components/admin/admin-form";
import { getPublishedCertificationBySlug } from "@/lib/db/certifications";
import { getEnrollment } from "@/lib/db/enrollments";
import { getCourseCompletion } from "@/lib/db/course-progress";
import {
  getAssignmentForCertification,
  getSubmission,
  upsertSubmission,
} from "@/lib/db/assignments";

const schema = z.object({
  slug: z.string().min(1).max(120),
  content: z.string().trim().min(1, "Write your submission before sending it."),
  link_url: z
    .string()
    .trim()
    .url("That link isn't a valid URL.")
    .max(500)
    .nullable(),
});

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function submitAssignmentAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to submit your assignment." };

  const rawLink = String(formData.get("link_url") ?? "").trim();
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    content: formData.get("content"),
    link_url: rawLink === "" ? null : rawLink,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const cert = await getPublishedCertificationBySlug(parsed.data.slug).catch(
    () => null,
  );
  if (!cert) return { error: "That course no longer exists." };

  const enrollment = await getEnrollment(user.uid, cert.id).catch(() => null);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
    return { error: "You need an active enrollment to submit this assignment." };
  }

  const assignment = await getAssignmentForCertification(cert.id);
  if (!assignment) return { error: "This course has no assignment." };

  // Approved work is not editable. The credential was issued against the text
  // that was read, and letting it change afterwards would make the review
  // mean nothing.
  const existing = await getSubmission(assignment.id, user.uid);
  if (existing?.status === "approved") {
    return { error: "This assignment has already been approved." };
  }

  // Re-checked here and not only on the page, because a page is not a gate.
  const completion = await getCourseCompletion(user.uid, cert.id);
  if (!completion.readyForAssignment) {
    return {
      error:
        "Finish every lesson and pass each chapter quiz before submitting the assignment.",
    };
  }

  const words = wordCount(parsed.data.content);
  if (words < assignment.min_words) {
    return {
      error: `Your submission is ${words} words. This assignment asks for at least ${assignment.min_words}.`,
    };
  }

  try {
    await upsertSubmission({
      assignmentId: assignment.id,
      userId: user.uid,
      content: parsed.data.content,
      linkUrl: parsed.data.link_url,
    });
  } catch (e) {
    console.error("assignment submit failed", e);
    return { error: "Couldn't send your submission. Try again." };
  }

  return {
    ok: "Submitted. A reviewer reads it and you'll hear back either way — usually within a few days.",
  };
}
