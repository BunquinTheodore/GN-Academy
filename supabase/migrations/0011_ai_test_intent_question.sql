-- 0011: non-scored "intent" question for the AI Readiness Test.
-- Captures the taker's goal (remote job / freelance clients / just
-- exploring) so the results page can flavor the certification
-- recommendation it always shows. Tagged with competency 'intent', which is
-- not in the COMPETENCIES registry (src/content/competencies.ts), so
-- scoreAttempt (src/lib/assessment/scoring.ts) silently excludes it from
-- scoring and the competency breakdown — it never affects the score.
--
-- Fixed id so the app can reference it directly (see
-- src/content/recommendations.ts:INTENT_QUESTION_ID) without depending on
-- gen_random_uuid() output. Placed at sort_order 16, after the 15 scored
-- questions, so it doesn't disturb the existing question order.

insert into public.questions
  (id, assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
values (
  'a0000000-0000-4000-8000-000000000050',
  'a0000000-0000-4000-8000-000000000001',
  16,
  'intent',
  'What are you hoping to get out of this?',
  '[{"id":"remote","text":"Land a remote job or employer-side role"},
    {"id":"freelance","text":"Win freelance or private clients"},
    {"id":"exploring","text":"Just exploring for now"}]',
  'remote',
  null
)
on conflict (id) do nothing;
