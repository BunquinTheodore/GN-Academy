import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type Certification = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  level: "foundation" | "professional" | "advanced";
  category: string | null;
  format: string | null;
  summary: string | null;
  description: string | null;
  skills: string[];
  outcomes: string[];
  roles: string[];
  price_php: number | null;
  is_free: boolean;
  passing_score: number;
  credential_prefix: string;
  hero_image_url: string | null;
  sort_order: number;
  requires_assignment: boolean;
  is_published: boolean;
};

export type Module = {
  id: string;
  certification_id: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export type LessonMeta = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  duration_minutes: number | null;
  sort_order: number;
  is_preview: boolean;
};

export type Lesson = LessonMeta & {
  content_mdx: string | null;
  video_url: string | null;
};

export async function listPublishedCertifications(): Promise<Certification[]> {
  const { data, error } = await supabaseAdmin()
    .from("certifications")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getPublishedCertificationBySlug(
  slug: string,
): Promise<Certification | null> {
  const { data, error } = await supabaseAdmin()
    .from("certifications")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getModulesWithLessonMeta(
  certificationId: string,
): Promise<{ module: Module; lessons: LessonMeta[] }[]> {
  // One round trip, not two. This sits on the critical path of every lesson
  // completion, and the database is a region away.
  const { data, error } = await supabaseAdmin()
    .from("modules")
    .select(
      "*, lessons ( id, module_id, title, slug, duration_minutes, sort_order, is_preview )",
    )
    .eq("certification_id", certificationId)
    .order("sort_order")
    .order("sort_order", { referencedTable: "lessons" });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { lessons, ...module } = row as Module & { lessons: LessonMeta[] };
    return { module, lessons: lessons ?? [] };
  });
}

/** Full lesson including content — caller must verify enrollment/preview first. */
export async function getLessonById(id: string): Promise<Lesson | null> {
  const { data, error } = await supabaseAdmin()
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCertificationForLesson(
  lessonId: string,
): Promise<{ certification: Certification; moduleId: string } | null> {
  const { data, error } = await supabaseAdmin()
    .from("lessons")
    .select("module_id, modules ( certification_id, certifications ( * ) )")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const mod = data.modules as unknown as {
    certification_id: string;
    certifications: Certification;
  };
  return { certification: mod.certifications, moduleId: data.module_id };
}

// ── Admin (service role; callers must have re-checked the admin claim) ──────

export type CertificationInput = {
  slug: string;
  title: string;
  subtitle: string | null;
  level: Certification["level"];
  category: string | null;
  format: string | null;
  summary: string | null;
  description: string | null;
  skills: string[];
  outcomes: string[];
  roles: string[];
  price_php: number | null;
  is_free: boolean;
  passing_score: number;
  credential_prefix: string;
  sort_order: number;
  is_published: boolean;
};

/** Includes drafts — the catalogue query deliberately does not. */
export async function listAllCertifications(): Promise<Certification[]> {
  const { data, error } = await supabaseAdmin()
    .from("certifications")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getCertificationById(
  id: string,
): Promise<Certification | null> {
  const { data, error } = await supabaseAdmin()
    .from("certifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCertification(
  input: CertificationInput,
): Promise<Certification> {
  const { data, error } = await supabaseAdmin()
    .from("certifications")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCertification(
  id: string,
  input: CertificationInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("certifications")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function listModules(certificationId: string): Promise<Module[]> {
  const { data, error } = await supabaseAdmin()
    .from("modules")
    .select("*")
    .eq("certification_id", certificationId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createModule(input: {
  certification_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("modules").insert(input);
  if (error) throw error;
}

export async function updateModule(
  id: string,
  input: { title: string; description: string | null; sort_order: number },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("modules")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

/** Cascades to lessons and their progress rows — the UI must confirm first. */
export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("modules").delete().eq("id", id);
  if (error) throw error;
}

export type LessonInput = {
  title: string;
  slug: string;
  content_mdx: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  sort_order: number;
  is_preview: boolean;
};

export async function createLesson(
  moduleId: string,
  input: LessonInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("lessons")
    .insert({ module_id: moduleId, ...input });
  if (error) throw error;
}

export async function updateLesson(
  id: string,
  input: LessonInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("lessons")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("lessons").delete().eq("id", id);
  if (error) throw error;
}

/** Admin variant of getModulesWithLessonMeta — includes lesson bodies. */
export async function getModulesWithLessons(
  certificationId: string,
): Promise<{ module: Module; lessons: Lesson[] }[]> {
  const modules = await listModules(certificationId);
  if (modules.length === 0) return [];

  const { data: lessons, error } = await supabaseAdmin()
    .from("lessons")
    .select("*")
    .in(
      "module_id",
      modules.map((m) => m.id),
    )
    .order("sort_order");
  if (error) throw error;

  return modules.map((module) => ({
    module,
    lessons: (lessons ?? []).filter((l) => l.module_id === module.id),
  }));
}
