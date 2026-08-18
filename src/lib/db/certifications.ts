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
  const { data: modules, error } = await supabaseAdmin()
    .from("modules")
    .select("*")
    .eq("certification_id", certificationId)
    .order("sort_order");
  if (error) throw error;
  if (!modules || modules.length === 0) return [];

  const { data: lessons, error: lessonError } = await supabaseAdmin()
    .from("lessons")
    .select("id, module_id, title, slug, duration_minutes, sort_order, is_preview")
    .in(
      "module_id",
      modules.map((m) => m.id),
    )
    .order("sort_order");
  if (lessonError) throw lessonError;

  return modules.map((module) => ({
    module,
    lessons: (lessons ?? []).filter((l) => l.module_id === module.id),
  }));
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
