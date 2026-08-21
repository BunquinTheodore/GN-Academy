"use server";

import { z } from "zod";
import { auditLog, requireAdmin } from "@/lib/auth/admin";
import { optional, optionalInt, parseList } from "@/lib/admin/form-values";
import type { AdminFormState } from "@/components/admin/admin-form";
import {
  createCertification,
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  updateCertification,
  updateLesson,
  updateModule,
  type CertificationInput,
} from "@/lib/db/certifications";

/**
 * Every public certification surface is cached, so they are purged together.
 * The paths are returned rather than revalidated here — see AdminFormState.
 */
function cataloguePaths(slug?: string): string[] {
  return slug
    ? ["/certifications", `/certifications/${slug}`, "/sitemap.xml"]
    : ["/certifications", "/sitemap.xml"];
}

const SLUG = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");

const certSchema = z.object({
  id: z.string().uuid().optional(),
  slug: SLUG,
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(200).nullable(),
  level: z.enum(["foundation", "professional", "advanced"]),
  category: z.string().trim().max(80).nullable(),
  format: z.string().trim().max(80).nullable(),
  summary: z.string().trim().max(600).nullable(),
  description: z.string().trim().max(6000).nullable(),
  price_php: z.number().int().min(0).max(1_000_000).nullable(),
  is_free: z.boolean(),
  passing_score: z.number().int().min(1).max(100),
  credential_prefix: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(10)
    .regex(/^[A-Z]+$/, "Letters only — it becomes the credential code prefix."),
  sort_order: z.number().int().min(0).max(9999),
  is_published: z.boolean(),
});

export async function saveCertificationAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const isFree = formData.get("is_free") === "on";
  const parsed = certSchema.safeParse({
    id: optional(formData.get("id")) ?? undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    subtitle: optional(formData.get("subtitle")),
    level: formData.get("level"),
    category: optional(formData.get("category")),
    format: optional(formData.get("format")),
    summary: optional(formData.get("summary")),
    description: optional(formData.get("description")),
    price_php: isFree ? null : optionalInt(formData.get("price_php")),
    is_free: isFree,
    passing_score: optionalInt(formData.get("passing_score")) ?? 70,
    credential_prefix: formData.get("credential_prefix"),
    sort_order: optionalInt(formData.get("sort_order")) ?? 0,
    is_published: formData.get("is_published") === "on",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "form"}: ${issue.message}` };
  }

  if (!parsed.data.is_free && parsed.data.price_php === null) {
    return { error: "A paid certification needs a price." };
  }

  const { id, ...rest } = parsed.data;
  const input: CertificationInput = {
    ...rest,
    skills: parseList(formData.get("skills")),
    outcomes: parseList(formData.get("outcomes")),
    roles: parseList(formData.get("roles")),
  };

  try {
    if (id) {
      await updateCertification(id, input);
      await auditLog({
        actorId: admin.uid,
        action: "certification.updated",
        entity: "certification",
        entityId: id,
        metadata: { slug: input.slug, is_published: input.is_published },
      });
      return { ok: "Saved.", revalidate: cataloguePaths(input.slug) };
    }

    const created = await createCertification(input);
    await auditLog({
      actorId: admin.uid,
      action: "certification.created",
      entity: "certification",
      entityId: created.id,
      metadata: { slug: input.slug },
    });
    return {
      ok: "Created.",
      revalidate: cataloguePaths(input.slug),
      redirectTo: `/admin/certifications/${created.id}`,
    };
  } catch (e) {
    console.error("save certification failed", e);
    const message = e instanceof Error ? e.message : "";
    if (message.includes("duplicate key")) {
      return {
        error: message.includes("credential_prefix")
          ? "That credential prefix is already used by another certification."
          : "That slug is already taken.",
      };
    }
    return { error: "Couldn't save. Check the fields and try again." };
  }
}

// ── Modules ─────────────────────────────────────────────────────────────────

const moduleSchema = z.object({
  certificationId: z.string().uuid(),
  moduleId: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).nullable(),
  sort_order: z.number().int().min(0).max(9999),
});

export async function saveModuleAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = moduleSchema.safeParse({
    certificationId: formData.get("certificationId"),
    moduleId: optional(formData.get("moduleId")) ?? undefined,
    title: formData.get("title"),
    description: optional(formData.get("description")),
    sort_order: optionalInt(formData.get("sort_order")) ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { certificationId, moduleId, ...rest } = parsed.data;

  try {
    if (moduleId) {
      await updateModule(moduleId, rest);
    } else {
      await createModule({ certification_id: certificationId, ...rest });
    }
    await auditLog({
      actorId: admin.uid,
      action: moduleId ? "module.updated" : "module.created",
      entity: "module",
      entityId: moduleId ?? null,
      metadata: { certification_id: certificationId, title: rest.title },
    });
    return {
      ok: moduleId ? "Module saved." : "Module added.",
      revalidate: cataloguePaths(),
    };
  } catch (e) {
    console.error("save module failed", e);
    return { error: "Couldn't save the module." };
  }
}

export async function deleteModuleAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const moduleId = z.string().uuid().safeParse(formData.get("moduleId"));
  const certificationId = z
    .string()
    .uuid()
    .safeParse(formData.get("certificationId"));
  if (!moduleId.success || !certificationId.success) {
    return { error: "Invalid request." };
  }
  if (formData.get("confirm") !== "on") {
    return {
      error: "Tick the confirmation box — this also deletes the module's lessons.",
    };
  }

  try {
    await deleteModule(moduleId.data);
    await auditLog({
      actorId: admin.uid,
      action: "module.deleted",
      entity: "module",
      entityId: moduleId.data,
      metadata: { certification_id: certificationId.data },
    });
    return { ok: "Module deleted.", revalidate: cataloguePaths() };
  } catch (e) {
    console.error("delete module failed", e);
    return { error: "Couldn't delete the module." };
  }
}

// ── Lessons ─────────────────────────────────────────────────────────────────

const lessonSchema = z.object({
  certificationId: z.string().uuid(),
  moduleId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(200),
  slug: SLUG,
  content_mdx: z.string().max(60_000).nullable(),
  video_url: z.string().trim().url().max(500).nullable().or(z.literal(null)),
  duration_minutes: z.number().int().min(0).max(600).nullable(),
  sort_order: z.number().int().min(0).max(9999),
  is_preview: z.boolean(),
});

export async function saveLessonAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = lessonSchema.safeParse({
    certificationId: formData.get("certificationId"),
    moduleId: formData.get("moduleId"),
    lessonId: optional(formData.get("lessonId")) ?? undefined,
    title: formData.get("title"),
    slug: formData.get("slug"),
    content_mdx: optional(formData.get("content_mdx")),
    video_url: optional(formData.get("video_url")),
    duration_minutes: optionalInt(formData.get("duration_minutes")),
    sort_order: optionalInt(formData.get("sort_order")) ?? 0,
    is_preview: formData.get("is_preview") === "on",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "form"}: ${issue.message}` };
  }

  const { certificationId, moduleId, lessonId, ...input } = parsed.data;

  try {
    if (lessonId) {
      await updateLesson(lessonId, input);
    } else {
      await createLesson(moduleId, input);
    }
    await auditLog({
      actorId: admin.uid,
      action: lessonId ? "lesson.updated" : "lesson.created",
      entity: "lesson",
      entityId: lessonId ?? null,
      metadata: {
        certification_id: certificationId,
        module_id: moduleId,
        title: input.title,
      },
    });
    return {
      ok: lessonId ? "Lesson saved." : "Lesson added.",
      revalidate: cataloguePaths(),
    };
  } catch (e) {
    console.error("save lesson failed", e);
    const message = e instanceof Error ? e.message : "";
    if (message.includes("duplicate key")) {
      return { error: "Another lesson in this module already uses that slug." };
    }
    return { error: "Couldn't save the lesson." };
  }
}

export async function deleteLessonAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const lessonId = z.string().uuid().safeParse(formData.get("lessonId"));
  const certificationId = z
    .string()
    .uuid()
    .safeParse(formData.get("certificationId"));
  if (!lessonId.success || !certificationId.success) {
    return { error: "Invalid request." };
  }

  try {
    await deleteLesson(lessonId.data);
    await auditLog({
      actorId: admin.uid,
      action: "lesson.deleted",
      entity: "lesson",
      entityId: lessonId.data,
      metadata: { certification_id: certificationId.data },
    });
    return { ok: "Lesson deleted.", revalidate: cataloguePaths() };
  } catch (e) {
    console.error("delete lesson failed", e);
    return { error: "Couldn't delete the lesson." };
  }
}
