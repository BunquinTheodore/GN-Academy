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

export async function markLessonComplete(
  userId: string,
  lessonId: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("lesson_progress")
    .upsert(
      { user_id: userId, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}
