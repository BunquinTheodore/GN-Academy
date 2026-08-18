-- Seed: AI Readiness Test (diagnostic, §8).
-- Questions are data, not code — edit them from /admin (phase 4) or here.
-- Competency keys: prompting (4q, 25%) · tools (4q, 20%) · workflow (4q, 35%)
-- · judgment (3q, 20%). Weights live in src/content/ai-test.ts and the
-- scoring engine; keep the per-competency question counts in sync.
-- Calibrated so a casual daily ChatGPT user lands in Developing (40–69).

insert into public.assessments (id, slug, title, type, question_count, max_attempts, is_published)
values (
  'a0000000-0000-4000-8000-000000000001',
  'ai-readiness',
  'AI Readiness Test',
  'diagnostic',
  15,
  1000,               -- effectively unlimited; abuse is handled by IP rate limits
  true
)
on conflict (slug) do nothing;

insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation) values

-- ── Prompting & Output Quality (4) ──────────────────────────────────────────
('a0000000-0000-4000-8000-000000000001', 1, 'prompting',
 'You''re a VA replying to a client''s customer on their behalf. Your first prompt — "write a polite reply to this email" — produced something generic that doesn''t sound like the business at all. What''s the better next move?',
 '[{"id":"a","text":"Accept it and heavily edit it yourself — AI can''t do tone"},
   {"id":"b","text":"Re-prompt with the business''s usual tone, what the customer actually asked, and the two points the reply must cover"},
   {"id":"c","text":"Reply \"make it better\" until it improves"},
   {"id":"d","text":"Open a new chat and try the exact same prompt again"}]',
 'b',
 'Generic output usually means a generic prompt. Feeding in tone, context, and required points fixes the cause instead of patching the symptom.'),

('a0000000-0000-4000-8000-000000000001', 2, 'prompting',
 'You''re applying for a remote customer support job and want AI help with the cover letter. Which approach produces something you''d actually send?',
 '[{"id":"a","text":"\"Write me a cover letter for a customer support job\""},
   {"id":"b","text":"Paste the job posting and your resume, then ask it to connect your three strongest matches to their stated needs in a professional tone"},
   {"id":"c","text":"Ask for ten different versions and choose the nicest one"},
   {"id":"d","text":"Ask AI what a cover letter should contain, then let it fill in the rest"}]',
 'b',
 'The job posting and your real experience are the raw material. Without them the model can only produce a template every other applicant also has.'),

('a0000000-0000-4000-8000-000000000001', 3, 'prompting',
 'A client needs product descriptions for 30 items in their online store, all in a consistent voice and format. How do you set the work up?',
 '[{"id":"a","text":"Prompt for each item one at a time, keeping the wording fresh each time"},
   {"id":"b","text":"Define the format once — fields, tone, length, example — then run every item through that same template"},
   {"id":"c","text":"Let the AI choose the best format per item; variety reads better"},
   {"id":"d","text":"Write five yourself, then tell the AI to \"continue in the same style\" without showing it the format rules"}]',
 'b',
 'A written template turns 30 unpredictable outputs into 30 consistent ones — and it''s reusable when the client adds products next month.'),

('a0000000-0000-4000-8000-000000000001', 4, 'prompting',
 'Your manager asked for a status update. The AI draft is four paragraphs and the one thing that matters — a deadline is slipping — is buried in the middle. What do you do?',
 '[{"id":"a","text":"Send it — everything is technically in there"},
   {"id":"b","text":"Reply \"make it shorter\" and send whatever comes back"},
   {"id":"c","text":"Re-prompt with a hard structure: lead with the risk, then three bullets, each under 15 words"},
   {"id":"d","text":"Give up on AI for anything a manager will read"}]',
 'c',
 'Vague fix requests get vague fixes. Specifying the structure — what leads, how many bullets, how long — makes the output match how the reader reads.'),

-- ── Tool Fluency (4) ────────────────────────────────────────────────────────
('a0000000-0000-4000-8000-000000000001', 5, 'tools',
 'A client hands you 200 PDF invoices and wants the totals and dates in a spreadsheet by Friday. What''s the right setup?',
 '[{"id":"a","text":"Paste each PDF into a chatbot one at a time and copy the answers over"},
   {"id":"b","text":"Use a tool built for document data extraction, then spot-check a sample of rows yourself"},
   {"id":"c","text":"Type them in manually — it''s the only way to be sure"},
   {"id":"d","text":"Tell the client it needs special enterprise software they should buy"}]',
 'b',
 'Chat is the wrong shape for 200 repetitive extractions. Purpose-built extraction plus a human spot-check is faster and more accurate than either extreme.'),

('a0000000-0000-4000-8000-000000000001', 6, 'tools',
 'Your freelance package for a client covers weekly social posts: writing captions, sizing images, and scheduling. How do you tool this?',
 '[{"id":"a","text":"One AI chatbot for all three jobs — captions, images, and posting"},
   {"id":"b","text":"AI for caption drafts, a design template tool for images, a scheduler for posting"},
   {"id":"c","text":"Everything manual — mixing tools creates mistakes"},
   {"id":"d","text":"Ask the client to buy an all-in-one marketing suite before starting"}]',
 'b',
 'Fluency means matching each job to the tool shaped for it. A chatbot drafts well, but it doesn''t crop images or post on schedule.'),

('a0000000-0000-4000-8000-000000000001', 7, 'tools',
 'You attend your US client''s 2 a.m. team call, recorded, and need to circulate minutes with action items. The efficient approach?',
 '[{"id":"a","text":"Replay the recording and type notes as you listen"},
   {"id":"b","text":"Run the recording through transcription, have AI draft minutes and action items from the transcript, then review before sending"},
   {"id":"c","text":"Ask someone else on the call for their notes"},
   {"id":"d","text":"Send the raw recording link — people can watch it themselves"}]',
 'b',
 'Transcribe → summarise → human review is the standard pipeline. The review step is part of the answer, not optional.'),

('a0000000-0000-4000-8000-000000000001', 8, 'tools',
 'You paste a client''s 80-page report into a free chatbot and the answers about later chapters come back vague or wrong. What''s going on, and what do you do?',
 '[{"id":"a","text":"The tool has a limit on how much it can hold — work through the report in sections with the same instruction each time"},
   {"id":"b","text":"The report is too complicated for AI — summarise it by hand"},
   {"id":"c","text":"Ask the chatbot to \"please remember the whole document\" and try again"},
   {"id":"d","text":"Wait a few hours — limits reset and it will read the rest"}]',
 'a',
 'Long inputs silently fall out of a model''s working context. Knowing that limit exists — and chunking around it — separates users from operators.'),

-- ── Workflow Integration (4) ────────────────────────────────────────────────
('a0000000-0000-4000-8000-000000000001', 9, 'workflow',
 'Your client asks for a weekly summary of about 40 customer support emails, every Friday. You''ve been pasting them into ChatGPT one at a time. What''s the better move?',
 '[{"id":"a","text":"Keep the same method but paste faster"},
   {"id":"b","text":"Build a reusable prompt template with a fixed output format and run the whole week''s emails as one batch"},
   {"id":"c","text":"Ask ChatGPT to work faster"},
   {"id":"d","text":"Tell the client a weekly summary isn''t possible"}]',
 'b',
 'The task repeats weekly, so the setup should be built once and reused — a template plus batching turns an afternoon of pasting into one run.'),

('a0000000-0000-4000-8000-000000000001', 10, 'workflow',
 'Every new client gets the same 5-email onboarding sequence from you, lightly personalised. You currently rewrite all five each time. Better system?',
 '[{"id":"a","text":"Keep rewriting from scratch — clients can tell when it''s not fully handmade"},
   {"id":"b","text":"Save the sequence as templates with slots for name, service, and dates; spend your time only on the parts that genuinely differ"},
   {"id":"c","text":"Have AI freestyle the whole sequence per client for maximum variety"},
   {"id":"d","text":"Send every client identical emails with no personalisation"}]',
 'b',
 'Systemise the 80% that repeats, keep human effort for the 20% that differs. That''s the core pattern of AI-era workflow design.'),

('a0000000-0000-4000-8000-000000000001', 11, 'workflow',
 'Your daily report takes 45 minutes: pull numbers from three dashboards, paste into a doc, write a summary. Where does AI genuinely fit?',
 '[{"id":"a","text":"Let AI estimate the numbers too — close enough is fine for a daily"},
   {"id":"b","text":"You keep pulling and checking the numbers; AI turns them into the summary using a fixed format you defined"},
   {"id":"c","text":"Ask AI to write the whole report from what it remembers about your company"},
   {"id":"d","text":"Nowhere — reports are too important to involve AI"}]',
 'b',
 'Split the task by what each side is good at: humans own the facts, AI owns the formatting and prose. Letting AI supply facts is how reports go wrong.'),

('a0000000-0000-4000-8000-000000000001', 12, 'workflow',
 'A client asks if you can add competitor research to your VA services. You''ve never offered it. What do you do?',
 '[{"id":"a","text":"Decline — only take work you already know end to end"},
   {"id":"b","text":"Accept, have AI generate the research, and deliver it as-is under your name"},
   {"id":"c","text":"Accept: use AI to structure the work and draft findings, verify every claim against real sources yourself, and be straight with the client about your process"},
   {"id":"d","text":"Accept and do it fully manually, however long it takes"}]',
 'c',
 'AI expands what you can credibly take on — if you stay the one accountable for accuracy. Delivering unverified AI output under your name is how VAs lose clients.'),

-- ── Judgment & Verification (3) ─────────────────────────────────────────────
('a0000000-0000-4000-8000-000000000001', 13, 'judgment',
 'AI gives you a confident statistic about Philippine freelance rates for a client proposal. What do you do first?',
 '[{"id":"a","text":"Use it — it sounded specific"},
   {"id":"b","text":"Ask the AI if it''s sure"},
   {"id":"c","text":"Verify it against a primary source before it reaches the client"},
   {"id":"d","text":"Rewrite it in your own words and use it"}]',
 'c',
 'Models produce confident numbers whether or not they''re real, and asking the model to double-check itself isn''t verification. Only a primary source is.'),

('a0000000-0000-4000-8000-000000000001', 14, 'judgment',
 'You asked AI to draft a payment-terms clause for your freelance contract, and it produced something that reads impressively legal. Before you put it in a contract you''ll sign?',
 '[{"id":"a","text":"Use it — it clearly knows contract language"},
   {"id":"b","text":"Check it against a trusted contract template or have someone qualified look at it"},
   {"id":"c","text":"Reword it so it sounds more like you"},
   {"id":"d","text":"Ask the AI to add more protective clauses to be safe"}]',
 'b',
 'Sounding legal and being enforceable are different things. Anything you''re legally bound by deserves a check against a source that carries real authority.'),

('a0000000-0000-4000-8000-000000000001', 15, 'judgment',
 'AI tells you that freelancers must file a specific BIR form you''ve never heard of, with a deadline next week. What''s the right response?',
 '[{"id":"a","text":"File it immediately — better safe than sorry"},
   {"id":"b","text":"Check the BIR''s official website or hotline before acting"},
   {"id":"c","text":"Ask the AI for its source, and trust the answer it gives"},
   {"id":"d","text":"Ignore it — AI makes tax stuff up"}]',
 'b',
 'Government requirements change and models hallucinate both forms and deadlines. A model quoting a source is not the same as the source existing — go to the authority itself.')

on conflict do nothing;
