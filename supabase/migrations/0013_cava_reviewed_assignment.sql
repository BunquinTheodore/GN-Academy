-- 0013: give CAVA the same reviewed-assignment shape as every other paid
-- course, instead of an auto-scored final exam.
--
-- Certified AI Virtual Assistant was the only paid certification (of 13) that
-- issued its credential from a passing score on a 10-question multiple-choice
-- exam (assessment slug cava-knowledge-exam), with no human review step. That
-- contradicts the course's own pitch: it explicitly sells that clients pay
-- for inboxes handled, reports delivered, and judgment they can trust, not
-- for having read ~1,600 words and passed a quiz. It is also the exact shape
-- src/lib/courses/content-checks.ts flags as broken for a JSON-authored
-- course: an assignment and a final exam both present while
-- requires_assignment is true, an ending (the exam) that ends nothing,
-- because only the assignment can release the credential.
--
-- This migration:
--   1. Deletes the old cava-knowledge-exam assessment and its 10 questions.
--   2. Adds three formative chapter quizzes (type 'chapter', one per CAVA
--      module, max_attempts 99, unlimited retakes like every other course's
--      chapter quizzes), seeded from the same 10 questions redistributed by
--      which module they actually test, plus one new question written for
--      module 2 (Content and communication), which the split otherwise left
--      with only two.
--   3. Adds the reviewed final assignment that now gates the credential.
--   4. Flips certifications.requires_assignment to true for CAVA, so
--      src/lib/credentials/issue.ts routes through assignment review instead
--      of auto-issuing on a passed exam.
--
-- supabase/seed.sql is updated to match, so a fresh install lands here
-- directly without ever creating the old exam row.

-- ── 1. remove the old auto-scored final exam ────────────────────────────────
-- Foreign-key order: questions reference assessments, so questions go first.
delete from public.questions
where assessment_id = 'a0000000-0000-4000-8000-000000000002';

delete from public.assessments
where id = 'a0000000-0000-4000-8000-000000000002';

-- ── 2. three chapter quizzes, one per CAVA module ───────────────────────────
insert into public.assessments
  (id, certification_id, module_id, slug, title, type, passing_score, question_count, max_attempts, is_published)
values
('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101',
 'certified-ai-virtual-assistant-chapter-1', 'AI-powered client operations: chapter quiz', 'chapter', 70, 4, 99, true),
('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000102',
 'certified-ai-virtual-assistant-chapter-2', 'Content and communication: chapter quiz', 'chapter', 70, 3, 99, true),
('a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000103',
 'certified-ai-virtual-assistant-chapter-3', 'Professional judgment: chapter quiz', 'chapter', 70, 4, 99, true)
on conflict (id) do nothing;

-- Chapter 1 (AI-powered client operations) — inbox triage, scheduling,
-- and the minutes pipeline: questions 1, 2, 3, and 9 from the old exam.
insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
select v.assessment_id::uuid, v.sort_order, v.competency, v.prompt, v.options::jsonb, v.correct, v.explanation
from (values

('a0000000-0000-4000-8000-000000000004', 1, 'workflow',
 'A new client''s inbox gets ~60 emails a day. Your first week, the right move is:',
 '[{"id":"a","text":"Turn on automatic AI replies for every single incoming message starting from day one, before you''ve learned anything about how this particular client actually works"},
   {"id":"b","text":"Read every email by hand indefinitely, since AI can''t be trusted with someone else''s inbox"},
   {"id":"c","text":"Set up triage categories with the client, run AI sorting daily, and spot-check it while you learn their patterns"},
   {"id":"d","text":"Reply to everything yourself, as fast as you possibly can"}]',
 'c',
 'Systems first, trust gradually. Auto-anything on day one risks the client relationship before you understand it.'),

('a0000000-0000-4000-8000-000000000004', 2, 'workflow',
 'You schedule a call for a Chicago client and a Manila supplier. Which confirmation line is correct practice?',
 '[{"id":"a","text":"\"Confirmed for Tuesday afternoon, sometime around 2 pm, exact time to be worked out once everyone replies.\""},
   {"id":"b","text":"\"Confirmed for Tuesday 2 pm CT, which is Wednesday 3 am PHT.\""},
   {"id":"c","text":"\"Confirmed. A calendar invite with all the details will follow shortly by email.\""},
   {"id":"d","text":"\"Confirmed for Tuesday.\""}]',
 'b',
 'Stating both time zones explicitly is the five-second habit that prevents the most expensive class of scheduling error.'),

('a0000000-0000-4000-8000-000000000004', 3, 'workflow',
 'Your minutes pipeline produced action items, but one is assigned to "Marc" and the call had a Mark and a Marj. You:',
 '[{"id":"a","text":"Check the transcript and recording to confirm who actually took the action item before sending"},
   {"id":"b","text":"Send it as-is without checking, since Marc, Mark, and Marj are close enough that everyone will probably figure out who''s meant"},
   {"id":"c","text":"Assign the action item to both Mark and Marj at the same time, just to be safe either way"},
   {"id":"d","text":"Drop the action item entirely"}]',
 'a',
 'Stage three of the pipeline, human review of names, numbers, and commitments, exists exactly for this.'),

('a0000000-0000-4000-8000-000000000004', 4, 'tools',
 'A client wants weekly minutes from their recorded 90-minute team calls. Your pipeline is:',
 '[{"id":"a","text":"Play back the entire ninety-minute recording from start to finish, from beginning to end, and type out everything you hear as you go"},
   {"id":"b","text":"Ask the client to keep their own notes during the call and just forward them to you afterward"},
   {"id":"c","text":"Upload the whole video file to a general-purpose chatbot and ask it to write the minutes"},
   {"id":"d","text":"Transcription tool, templated AI summary, human review of names, numbers, and commitments, delivered within hours"}]',
 'd',
 'Purpose-built transcription, templated summarisation, human verification: each stage doing the job it''s shaped for.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000004'
);

-- Chapter 2 (Content and communication) — voice briefs and batch captions
-- (questions 4 and 5 from the old exam), plus one new question written to
-- cover the "Reports clients actually read" lesson, which the old exam
-- never tested and which otherwise left this chapter with only two.
insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
select v.assessment_id::uuid, v.sort_order, v.competency, v.prompt, v.options::jsonb, v.correct, v.explanation
from (values

('a0000000-0000-4000-8000-000000000005', 1, 'prompting',
 'A client says your AI-drafted replies "don''t sound like me at all." The systematic fix is:',
 '[{"id":"a","text":"Build a voice brief from real examples of their writing and include it in every drafting prompt"},
   {"id":"b","text":"Keep editing every single draft more and more heavily by hand each time, for as long as this client stays with you"},
   {"id":"c","text":"Ask the AI to simply try sounding more human next time"},
   {"id":"d","text":"Stop using AI to draft anything for this particular client"}]',
 'a',
 'Per-draft editing treats the symptom. A voice brief fixes the input, so every future draft starts in the client''s voice.'),

('a0000000-0000-4000-8000-000000000005', 2, 'prompting',
 'You need 30 product captions in a consistent format. The professional setup is:',
 '[{"id":"a","text":"Write thirty separate, completely different creative prompts by hand, one at a time, so each caption feels fresh and unique"},
   {"id":"b","text":"One prompt defining the hook, body, CTA, and hashtags, then the whole batch through it, then one batch edit pass"},
   {"id":"c","text":"Write five captions manually yourself and hope the AI can guess the pattern from just that"},
   {"id":"d","text":"Just ask the AI to be creative and consistent"}]',
 'b',
 'Fixed template + batch generation + batch review: consistent voice, one approval cycle, repeatable next month.'),

('a0000000-0000-4000-8000-000000000005', 3, 'workflow',
 'A client asks for this week''s report. You have the real numbers, but you''re short on time. What''s the right way to use AI here?',
 '[{"id":"a","text":"Give the AI last week''s finished report and simply ask it to update the numbers itself without your involvement"},
   {"id":"b","text":"Ask the AI to estimate this week''s numbers by projecting from the trend so far"},
   {"id":"c","text":"Skip the structure entirely and just paste the raw numbers with no summary"},
   {"id":"d","text":"Pull the real numbers yourself first, then have AI turn them into the summary, bullets, and next step"}]',
 'd',
 'The report''s structure is fixed and reusable; only the numbers change, and only you supply those. AI''s job stays limited to turning verified numbers into prose.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000005'
);

-- Chapter 3 (Professional judgment) — verification, privacy, and pricing:
-- questions 6, 7, 8, and 10 from the old exam.
insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
select v.assessment_id::uuid, v.sort_order, v.competency, v.prompt, v.options::jsonb, v.correct, v.explanation
from (values

('a0000000-0000-4000-8000-000000000006', 1, 'judgment',
 'While drafting a client proposal, the AI includes: "The Philippine VA industry grew 34% in 2025." You can''t find this figure anywhere. You:',
 '[{"id":"a","text":"Keep it in the proposal since it''s probably approximately correct anyway"},
   {"id":"b","text":"Ask the AI where the number came from and just cite whatever source it gives you back"},
   {"id":"c","text":"Cut the number, or replace it with a figure from a source you can actually name"},
   {"id":"d","text":"Soften the wording to \"reportedly grew around 34 percent\""}]',
 'c',
 'An unverifiable statistic has no place in a client deliverable. Softening or citing an AI-invented source just launders the invention.'),

('a0000000-0000-4000-8000-000000000006', 2, 'judgment',
 'A client emails you their database of 800 customers and asks for a churn summary. Before using an AI tool on it, you:',
 '[{"id":"a","text":"Paste the entire database in as-is, since the client sent it to you and that counts as authorisation"},
   {"id":"b","text":"Strip out the personal identifiers the analysis doesn''t need, and confirm the client''s AI-tool policy first"},
   {"id":"c","text":"Refuse the task outright, since customer data should never, under any circumstances, be allowed to touch an AI tool"},
   {"id":"d","text":"Do it, but remember to delete the chat log afterward"}]',
 'b',
 'The client authorised the analysis, not disclosure to third-party tools. Minimise the data and know the policy. That''s Data Privacy Act territory.'),

('a0000000-0000-4000-8000-000000000006', 3, 'judgment',
 'The client asks you to sign an updated contract the AI helped them draft. One clause reads oddly to you. You:',
 '[{"id":"a","text":"Sign it anyway, since refusing or raising any kind of question about it now might look difficult or awkward to the client"},
   {"id":"b","text":"Ask the client''s own AI assistant whether it thinks the clause seems fair to both sides"},
   {"id":"c","text":"Just cross out that one clause yourself and sign the rest of the contract as it is"},
   {"id":"d","text":"Check that specific clause against a trusted template, or with someone qualified, before you sign anything"}]',
 'd',
 'Anything legally binding gets verified against real authority, the same ladder as every consequential claim.'),

('a0000000-0000-4000-8000-000000000006', 4, 'workflow',
 'AI has cut your monthly-report time from 4 hours to 1. You bill that client hourly. The sustainable move is:',
 '[{"id":"a","text":"Say nothing about the time saved and just keep billing the client for four full hours of work every single month regardless"},
   {"id":"b","text":"Bill only the one hour it actually took this month, and quietly absorb the resulting pay cut"},
   {"id":"c","text":"Propose fixed deliverable pricing for the report instead, reflecting its value and your verification work"},
   {"id":"d","text":"Deliberately slow yourself back down so the report takes four hours again like before"}]',
 'c',
 'Billing phantom hours is dishonest; absorbing the cut punishes your own efficiency. Deliverable pricing aligns pay with value, and it''s honest.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000006'
);

-- ── 3. the reviewed final assignment ─────────────────────────────────────────
insert into public.assignments (id, certification_id, title, brief_mdx, criteria, min_words, is_published)
values (
  '10000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'One client, four proofs',
  E'Pick one real or realistically invented VA client you could plausibly work for: a small business owner, an online seller, a coach, or a solo consultant. Invent the name and the business. Never use a real, identifiable person or business anywhere in this submission. Then submit one document with four parts.\n\n**1. Voice brief and draft.** Write a voice brief for your invented client in the format this course teaches: three tone words, at least one banned phrase, and how the client opens and closes a message. Base it on a short writing sample from the client that you invent and include (three to five sentences is enough). Then use the brief to write one actual draft, a reply to a customer email or a short social caption, and show the finished draft next to the brief it came from.\n\n**2. A report from real numbers.** You are given this month''s figures for the client''s support inbox: 248 emails received, 231 replied to within 24 hours, 9 escalated to the client directly, and an average first-reply time of 3.6 hours against a 4-hour target. Build the report using the exact structure this course teaches: a one-line summary, three bullets, and one line on the next step. Every number in your report must trace back to the four figures above. Do not add, estimate, or invent a single additional number.\n\n**3. Minutes pipeline, with a catch.** Here is an accurate excerpt from a client call transcript: "Next steps: Marjorie''s going to send the updated supplier invoice by Thursday. We also need to confirm the reorder amount with the vendor, it''s fifteen thousand pesos, not fifty, we already caught that mistake once. Mark, can you follow up with the vendor directly." Here is the AI-drafted action list from that same call: "Marc to send updated supplier invoice by Thursday. Follow up with vendor to confirm reorder amount of 50,000 pesos." Write the corrected action items you would actually send, and add one line stating exactly what you caught and fixed against the transcript, and why you''re confident about the fix.\n\n**4. A scoping and privacy call.** A long-time client asks you to run their full customer database, 600 records including names, emails, and phone numbers, through an AI tool to find their highest-spending customers. In the same message, they mention that since AI has made your reporting so much faster, they''d like to renegotiate your monthly rate down, since "the report barely takes you any time now." In 150 to 250 words, explain what you would do about the data before touching any AI tool, and how you would respond to the pricing request. Ground both answers in habits this course actually teaches: the paste test, and pricing the outcome rather than the hours. No artifact is needed for this part, only your written reasoning.\n\nDo not invent details about a real, identifiable client, business, or person anywhere in this submission; every name and writing sample must be invented for this exercise. Every number in the report must be traceable to the four figures given above, with nothing added or estimated. Submit at least 900 words across all four parts combined.',
  array[
    'The voice brief has three tone words, at least one banned phrase, and a real open/close pattern, and the draft that follows it actually reads in that voice rather than as generic AI output',
    'The report follows the exact taught structure (one-line summary, three bullets, next step), and every number in it traces back to the four figures given, with none invented or estimated',
    'The minutes response correctly identifies and corrects the specific errors in the AI-drafted action list (the name and the reorder amount), not just a general note that it was reviewed',
    'The privacy and pricing response gives real reasoning grounded in the paste test and outcome-based pricing rather than a template answer, and stays within the stated word range',
    'No real, identifiable client, business, or person appears anywhere in the submission'
  ],
  900,
  true
)
on conflict (id) do nothing;

-- ── 4. route the credential through review instead of the (now-deleted) exam ─
update public.certifications
set requires_assignment = true
where slug = 'certified-ai-virtual-assistant';
