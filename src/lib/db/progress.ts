import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function getCompletedLessonIds(
  userId: string,
  lessonIds: string[],
): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin()
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.lesson_id));
}

/** Returns true when this call is the one that completed the lesson. */
export async function markLessonComplete(
  userId: string,
  lessonId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("lesson_progress")
    .upsert(
      { user_id: userId, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
