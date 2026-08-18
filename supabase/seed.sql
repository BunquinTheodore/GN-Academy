-- Seed data. Idempotent: fixed UUIDs + on-conflict guards; question sets
-- insert only when their assessment has no questions yet, so /admin edits
-- survive re-seeding. Content is data — edit here or from /admin (phase 4).

-- ════════════════════════════════════════════════════════════════════════════
-- Assessments
-- ════════════════════════════════════════════════════════════════════════════

insert into public.assessments (id, slug, title, type, question_count, max_attempts, is_published)
values (
  'a0000000-0000-4000-8000-000000000001',
  'ai-readiness',
  'AI Readiness Test',
  'diagnostic',
  15,
  1000,               -- effectively unlimited; abuse handled by IP rate limits
  true
)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- AI Readiness Test — 15 questions (§8)
-- prompting 4 (25%) · tools 4 (20%) · workflow 4 (35%) · judgment 3 (20%)
-- Calibrated so a casual daily ChatGPT user lands in Developing (40–69).
-- ════════════════════════════════════════════════════════════════════════════

insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
select v.assessment_id::uuid, v.sort_order, v.competency, v.prompt, v.options::jsonb, v.correct, v.explanation
from (values

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

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000001'
);

-- ════════════════════════════════════════════════════════════════════════════
-- Certifications
-- ════════════════════════════════════════════════════════════════════════════

insert into public.certifications
  (id, slug, title, subtitle, level, category, format, summary, description,
   skills, outcomes, roles, price_php, is_free, passing_score,
   credential_prefix, sort_order, is_published)
values
(
  'c0000000-0000-4000-8000-000000000001',
  'certified-ai-virtual-assistant',
  'Certified AI Virtual Assistant',
  'Run client operations with AI — and prove it',
  'professional', 'Virtual assistance', 'Self-paced online',
  'The professional standard for VAs who use AI as a working tool, not a novelty. Nine practical lessons, a scored exam, and a publicly verifiable credential.',
  'Clients don''t pay for "knows ChatGPT" — they pay for inboxes handled, reports delivered, and judgment they can trust. This certification covers the three things AI-era VAs are actually hired for: running client operations with AI in the loop, producing client-ready communication at speed, and knowing when not to trust the machine. Every lesson is built around real VA scenarios, and the exam tests decisions, not definitions. Pass it and your credential gets a public verification page any client can check in seconds.',
  array['AI-assisted inbox management','Prompt templates','Meeting-notes pipelines','Client-voice writing','Output verification','Confidentiality practice'],
  array['Set up reusable AI workflows for recurring client tasks','Produce client-ready drafts in the client''s voice','Verify AI output before it reaches a client','Scope and price AI-assisted services honestly'],
  array['Virtual assistant','Executive assistant','Freelance operations support'],
  1499, false, 70,
  'CAVA', 1, true
),
(
  'c0000000-0000-4000-8000-000000000002',
  'ai-foundations',
  'AI Foundations Certificate',
  'The free starting point — no payment, no catch',
  'foundation', 'Foundations', 'Self-paced online',
  'A free certificate course covering exactly what the AI Readiness Test measures: prompting, tools, workflow, and judgment — built for Filipino work contexts.',
  'If your AI Readiness result said Beginner or Developing, this is the gap-closer. Five short lessons take you from "I chat with AI sometimes" to a working method: how to brief AI like a colleague, pick the right tool for a task, build a repeatable workflow, and catch confident nonsense before it costs you. Finish the lessons, pass the free exam, and earn a verifiable certificate — your first entry on the credential ladder.',
  array['Prompting fundamentals','Tool selection','Basic AI workflows','Output verification'],
  array['Brief AI with context, constraints, and format','Choose the right tool for a task instead of defaulting to chat','Turn a repeating task into a reusable workflow','Verify AI claims against real sources'],
  array['Students','Jobseekers','Anyone starting with AI'],
  null, true, 70,
  'AIF', 0, true
)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Modules and lessons
-- ════════════════════════════════════════════════════════════════════════════

insert into public.modules (id, certification_id, title, description, sort_order) values
('d0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000001',
 'AI-powered client operations', 'The recurring work every VA is hired for — inbox, calendar, meetings — rebuilt with AI in the loop.', 1),
('d0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000001',
 'Content and communication', 'Producing client-ready writing at speed without losing the client''s voice.', 2),
('d0000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000001',
 'Professional judgment', 'The part clients actually pay a premium for: knowing when not to trust the machine.', 3),
('d0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000002',
 'Working with AI', 'What AI is actually good at, and how to brief it so it delivers.', 1),
('d0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000002',
 'Working safely', 'Verification and privacy — the habits that keep AI from costing you a job or a client.', 2)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, slug, content_mdx, duration_minutes, sort_order, is_preview) values

-- CAVA · Module 1
('e0000000-0000-4000-8000-000000000111', 'd0000000-0000-4000-8000-000000000101',
 'Inbox and email workflows with AI', 'inbox-workflows',
 E'# Inbox and email workflows with AI\n\nAn inbox is a queue of small decisions, and most of them repeat. The VAs who scale are the ones who stop treating each email as a fresh problem.\n\n## The triage-first method\n\nBefore AI writes anything, it can *sort*. A daily triage prompt with fixed categories — needs reply today, needs the client''s decision, FYI only, spam — turns forty unread emails into four short lists.\n\n- Keep the categories stable; changing them daily breaks the habit\n- Always include "needs the client''s decision" — guessing on their behalf is how trust dies\n- Spot-check the sorting for the first two weeks before you rely on it\n\n## Drafting replies\n\nBuild one reply template per *type* of email the client receives, not per email. Each template carries the client''s tone, sign-off, and boundaries (what you may promise, what you may not). The AI fills the specifics; you verify anything factual before sending.',
 12, 1, true),

('e0000000-0000-4000-8000-000000000112', 'd0000000-0000-4000-8000-000000000101',
 'Calendar and scheduling systems', 'calendar-systems',
 E'# Calendar and scheduling systems\n\nScheduling across time zones is where VAs earn quiet loyalty — and where a single AM/PM slip costs a client a sales call.\n\n## Let AI compute, you confirm\n\nAI is good at the conversion arithmetic ("2 pm Tuesday in Chicago is 3 am Wednesday in Manila") and bad at knowing which meetings matter. Use it to draft options, never to send invites unreviewed.\n\n- Keep the client''s scheduling rules in one written brief: buffer times, no-meeting blocks, priority contacts\n- Paste that brief into every scheduling prompt — context beats memory\n- Confirm the final time in BOTH time zones in the confirmation email, every time\n\nThe double-time-zone confirmation line is a professional habit that costs five seconds and has saved more client relationships than any tool.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000113', 'd0000000-0000-4000-8000-000000000101',
 'Meeting notes and minutes pipelines', 'minutes-pipelines',
 E'# Meeting notes and minutes pipelines\n\nA recorded call plus a transcription tool plus a summary prompt is a pipeline — set it up once and every meeting flows through it.\n\n## The three-stage pipeline\n\n1. **Transcribe** the recording with a transcription tool (not a chat window)\n2. **Summarise** with a fixed template: decisions made, action items with owners and dates, open questions\n3. **Review** — you, not the AI, check names, numbers, and commitments against the transcript\n\nStage 3 is not optional. Transcripts garble Filipino and English name spellings constantly, and an action item assigned to the wrong person creates real damage.\n\nDeliver minutes within two hours of the call while context is fresh — with the pipeline, that''s ten minutes of your attention.',
 10, 3, false),

-- CAVA · Module 2
('e0000000-0000-4000-8000-000000000121', 'd0000000-0000-4000-8000-000000000102',
 'Client-voice writing with templates', 'client-voice-writing',
 E'# Client-voice writing with templates\n\nEvery client has a voice, and generic AI output has none. The bridge is a **voice brief**: a half-page document you write once per client.\n\n## What goes in a voice brief\n\n- Three real examples of the client''s own writing\n- Tone words they''d agree with ("warm but direct", "no exclamation points")\n- Words and phrases they never use\n- How they open and close messages\n\nPaste the brief into any writing prompt and the drafts start sounding like *them*. Update it when the client corrects you — every correction is voice data.\n\nA VA with voice briefs for five clients can switch between them in seconds. That''s a service no generic chatbot user can offer.',
 12, 1, false),

('e0000000-0000-4000-8000-000000000122', 'd0000000-0000-4000-8000-000000000102',
 'Social and marketing support', 'social-marketing-support',
 E'# Social and marketing support\n\nMarketing support is batch work, and batch work is where AI multiplies you — if the format is fixed.\n\n## Batch, don''t improvise\n\nA month of captions produced in one sitting from one template beats thirty daily improvisations: consistent voice, consistent hashtags, and the client approves everything at once.\n\n- Define the caption template: hook, body, call to action, hashtag set\n- Generate the month, then edit as a batch — repetitive AI phrasing is obvious when you read thirty in a row, invisible when you read one a day\n- Keep a "used hooks" list so months don''t repeat themselves\n\nSend the batch for approval in one document. Clients notice when review takes them ten minutes instead of a message thread every morning.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000123', 'd0000000-0000-4000-8000-000000000102',
 'Reports clients actually read', 'reports-clients-read',
 E'# Reports clients actually read\n\nClients skim. A report''s job is to survive skimming.\n\n## Structure before prose\n\nThe unbreakable rule from the AI Readiness Test applies here: **you own the numbers, AI owns the prose.** Pull the real figures yourself, then let AI turn them into sentences using a fixed structure:\n\n1. One-line summary — what changed and whether it''s good\n2. Three bullets of what happened, most important first\n3. One line on what you''ll do next\n\nAnything longer goes in an appendix nobody is required to read.\n\nNever let AI estimate, extrapolate, or "fill in" a number you didn''t supply. A report with one invented figure is worth less than no report — because the client no longer trusts the other figures either.',
 8, 3, false),

-- CAVA · Module 3
('e0000000-0000-4000-8000-000000000131', 'd0000000-0000-4000-8000-000000000103',
 'Verification before delivery', 'verification-before-delivery',
 E'# Verification before delivery\n\nAI states falsehoods with total confidence. Your value as a professional is the checkpoint between that confidence and your client.\n\n## The verification ladder\n\nMatch the effort to the stakes:\n\n- **Low stakes** (internal draft, brainstorm): skim for obvious nonsense\n- **Client-facing** (emails, posts, reports): check every name, number, date, and link\n- **Consequential** (contracts, legal or tax claims, statistics in proposals): verify against a primary source, or route to someone qualified\n\n"The AI said so" is never a defense a client accepts. If you can''t verify a claim, cut it or flag it — delivering it unverified under your name converts an AI error into *your* error.',
 10, 1, false),

('e0000000-0000-4000-8000-000000000132', 'd0000000-0000-4000-8000-000000000103',
 'Data privacy and client confidentiality', 'privacy-confidentiality',
 E'# Data privacy and client confidentiality\n\nEvery paste into an AI tool is a disclosure decision. Most VAs never think about it once; certified ones think about it every time.\n\n## The paste test\n\nBefore pasting client material into any tool, ask: *would the client be comfortable seeing this exact text on my screen-share?*\n\n- Strip names, emails, amounts, and identifiers when the task doesn''t need them — "Customer A complained about late delivery" summarises as well as the real name\n- Never paste credentials, card numbers, or government IDs into anything, ever\n- Know whether your client has rules about AI tools — ask once, in writing, early\n\nUnder the Philippines'' Data Privacy Act, mishandling personal data has legal weight. "The tool needed it" is not a lawful basis.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000133', 'd0000000-0000-4000-8000-000000000103',
 'Scoping and pricing AI-assisted work', 'scoping-pricing',
 E'# Scoping and pricing AI-assisted work\n\nAI makes you faster. Whether that raises or destroys your income depends entirely on how you price.\n\n## Price the outcome, not the hours\n\nIf a report used to take four hours and now takes one, hourly billing just cut your pay by 75% for the same value delivered. Move recurring AI-accelerated work to fixed deliverable pricing: *"weekly summary report, ₱X per month."*\n\n- Be honest that you use AI in your process — and equally clear that you verify everything personally\n- Charge for the judgment, the reliability, and the client-specific setup you''ve built; those don''t come with a chatbot subscription\n- When a client says "can''t AI just do that?", the answer is your verification ladder and voice briefs — show the system, not the tool\n\nThe VAs who lose to AI are the ones selling typing. Sell operations.',
 10, 3, false),

-- AIF · Module 1
('e0000000-0000-4000-8000-000000000211', 'd0000000-0000-4000-8000-000000000201',
 'What AI can and can''t do for your work', 'what-ai-can-do',
 E'# What AI can and can''t do for your work\n\nAI language tools are pattern machines: astonishing at producing plausible text, structurally incapable of knowing whether that text is true.\n\n## Strong at\n\n- Drafting, rewriting, and summarising text you supply\n- Reformatting — messy notes into tables, bullets into paragraphs\n- Explaining concepts and generating options to react to\n\n## Weak at\n\n- Facts it wasn''t given — it fills gaps with confident invention\n- Anything current — prices, laws, deadlines, news\n- Knowing your context unless you spell it out\n\nOne rule carries this whole course: **AI drafts, you decide.** Every lesson that follows is a specific application of it.',
 8, 1, true),

('e0000000-0000-4000-8000-000000000212', 'd0000000-0000-4000-8000-000000000201',
 'Prompting fundamentals', 'prompting-fundamentals',
 E'# Prompting fundamentals\n\nThe quality of AI output tracks the quality of the briefing — the same way a work request to a colleague does.\n\n## Brief it like a colleague\n\nA useful prompt carries four things:\n\n1. **Role & context** — who is this for, what''s the situation\n2. **Task** — the specific thing to produce\n3. **Constraints** — length, tone, what to avoid\n4. **Format** — bullets? table? email? how many words?\n\n"Write a job application email" gets a template. "Write a 120-word application email for this posting [pasted], highlighting my two years of customer support experience, professional but not stiff" gets a draft you can actually send.\n\nWhen output disappoints, fix the briefing before blaming the tool — re-read your prompt and ask which of the four parts is missing.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000213', 'd0000000-0000-4000-8000-000000000201',
 'Choosing the right tool for the task', 'choosing-tools',
 E'# Choosing the right tool for the task\n\nChat is the default AI interface, not the universal one. Reaching for the right shape of tool is a skill employers notice.\n\n## Match tool to task\n\n- **Conversation & drafting** → chat assistants\n- **Long documents** → tools built for document upload, or work in sections\n- **Repetitive extraction** (invoices, forms) → extraction tools, not chat\n- **Audio & video** → transcription first, then summarise the transcript\n- **Images** → design template tools; chatbots don''t crop or resize\n\nTwo habits: check whether a purpose-built tool exists before forcing chat to do everything, and learn the limits (length, file types, daily caps) of the free tiers you rely on — hitting an invisible wall mid-deadline is preventable.',
 8, 3, false),

-- AIF · Module 2
('e0000000-0000-4000-8000-000000000221', 'd0000000-0000-4000-8000-000000000202',
 'Verifying AI output', 'verifying-output',
 E'# Verifying AI output\n\nAI errors don''t look like errors. They arrive fluent, specific, and formatted exactly like the truth.\n\n## What always gets checked\n\nBefore AI text reaches anyone who matters — an employer, a client, a government office — verify:\n\n- **Names and titles** — misspelling a hiring manager''s name ends applications\n- **Numbers and dates** — salaries, deadlines, statistics, prices\n- **Claims of fact** — laws, requirements, "studies show..."\n- **Links** — AI invents URLs that look real and go nowhere\n\nVerification means checking a real source: the official website, the original document, the actual person. Asking the AI "are you sure?" is not verification — it will apologise and then be confidently wrong in a new direction.',
 8, 1, false),

('e0000000-0000-4000-8000-000000000222', 'd0000000-0000-4000-8000-000000000202',
 'Privacy basics for AI tools', 'privacy-basics',
 E'# Privacy basics for AI tools\n\nWhat you paste into an AI tool leaves your hands. Treat every paste as a small publication decision.\n\n## The rules that keep you safe\n\n- Never paste passwords, one-time codes, bank or card numbers, or government IDs — no task needs them\n- Don''t paste other people''s personal details (a friend''s medical situation, a customer database) without their knowledge\n- At work, follow your employer''s AI rules — and if none exist, ask before pasting company documents\n- Prefer summarising sensitive material in your own anonymised words over pasting it raw\n\nThe Philippines'' Data Privacy Act protects personal data by law. Good privacy habits aren''t just self-protection — handling other people''s data carelessly has real consequences.',
 8, 2, false)

on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Certification exams (reuse the assessment engine)
-- ════════════════════════════════════════════════════════════════════════════

insert into public.assessments (id, certification_id, slug, title, type, passing_score, question_count, max_attempts, is_published) values
('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
 'cava-knowledge-exam', 'Certified AI Virtual Assistant — Knowledge Exam', 'knowledge', 70, 10, 3, true),
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002',
 'ai-foundations-exam', 'AI Foundations — Certificate Exam', 'knowledge', 70, 8, 3, true)
on conflict (slug) do nothing;

-- CAVA exam — 10 questions
insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
select v.assessment_id::uuid, v.sort_order, v.competency, v.prompt, v.options::jsonb, v.correct, v.explanation
from (values

('a0000000-0000-4000-8000-000000000002', 1, 'workflow',
 'A new client''s inbox gets ~60 emails a day. Your first week, the right move is:',
 '[{"id":"a","text":"Reply to everything as fast as possible to show speed"},
   {"id":"b","text":"Set up triage categories with the client, run AI sorting daily, and spot-check it while you learn their patterns"},
   {"id":"c","text":"Let AI auto-reply to routine messages from day one"},
   {"id":"d","text":"Read everything manually forever — AI can''t be trusted with email"}]',
 'b',
 'Systems first, trust gradually. Auto-anything on day one risks the client relationship before you understand it.'),

('a0000000-0000-4000-8000-000000000002', 2, 'workflow',
 'You schedule a call for a Chicago client and a Manila supplier. Which confirmation line is correct practice?',
 '[{"id":"a","text":"\"Confirmed for Tuesday 2 pm.\""},
   {"id":"b","text":"\"Confirmed for Tuesday 2 pm CT / Wednesday 3 am PHT.\""},
   {"id":"c","text":"\"Confirmed — calendar invite to follow.\""},
   {"id":"d","text":"\"Confirmed for Tuesday afternoon your time.\""}]',
 'b',
 'Stating both time zones explicitly is the five-second habit that prevents the most expensive class of scheduling error.'),

('a0000000-0000-4000-8000-000000000002', 3, 'workflow',
 'Your minutes pipeline produced action items, but one is assigned to "Marc" and the call had a Mark and a Marj. You:',
 '[{"id":"a","text":"Send as-is — close enough, they''ll figure it out"},
   {"id":"b","text":"Check the transcript and recording to confirm who actually took the action item before sending"},
   {"id":"c","text":"Assign it to both to be safe"},
   {"id":"d","text":"Drop the item — ambiguous ones cause trouble"}]',
 'b',
 'Stage three of the pipeline — human review of names, numbers, and commitments — exists exactly for this.'),

('a0000000-0000-4000-8000-000000000002', 4, 'prompting',
 'A client says your AI-drafted replies "don''t sound like me at all." The systematic fix is:',
 '[{"id":"a","text":"Edit each draft more heavily by hand from now on"},
   {"id":"b","text":"Build a voice brief from real examples of their writing and include it in every drafting prompt"},
   {"id":"c","text":"Ask the AI to \"sound more human\""},
   {"id":"d","text":"Stop using AI for this client"}]',
 'b',
 'Per-draft editing treats the symptom. A voice brief fixes the input, so every future draft starts in the client''s voice.'),

('a0000000-0000-4000-8000-000000000002', 5, 'prompting',
 'You need 30 product captions in a consistent format. The professional setup is:',
 '[{"id":"a","text":"One prompt defining hook/body/CTA/hashtags, then the whole batch through it, then a batch edit pass"},
   {"id":"b","text":"Thirty separate creative prompts for variety"},
   {"id":"c","text":"Ask the AI to \"be creative and consistent\""},
   {"id":"d","text":"Write 5 manually and have AI guess the pattern from nothing"}]',
 'a',
 'Fixed template + batch generation + batch review: consistent voice, one approval cycle, repeatable next month.'),

('a0000000-0000-4000-8000-000000000002', 6, 'judgment',
 'While drafting a client proposal, the AI includes: "The Philippine VA industry grew 34% in 2025." You can''t find this figure anywhere. You:',
 '[{"id":"a","text":"Keep it — it''s probably approximately right"},
   {"id":"b","text":"Cut it or replace it with a figure from a source you can name"},
   {"id":"c","text":"Soften it to \"reportedly grew around 34%\""},
   {"id":"d","text":"Ask the AI for its source and cite whatever it answers"}]',
 'b',
 'An unverifiable statistic has no place in a client deliverable. Softening or citing an AI-invented source just launders the invention.'),

('a0000000-0000-4000-8000-000000000002', 7, 'judgment',
 'A client emails you their database of 800 customers and asks for a churn summary. Before using an AI tool on it, you:',
 '[{"id":"a","text":"Paste it all in — the client sent it, so it''s authorised"},
   {"id":"b","text":"Strip or anonymise personal identifiers the analysis doesn''t need, and confirm the client''s AI-tool policy if you haven''t"},
   {"id":"c","text":"Refuse the task — customer data can never touch AI"},
   {"id":"d","text":"Do it, but delete the chat afterwards"}]',
 'b',
 'The client authorised the analysis, not disclosure to third-party tools. Minimise the data, know the policy — that''s Data Privacy Act territory.'),

('a0000000-0000-4000-8000-000000000002', 8, 'judgment',
 'The client asks you to sign an updated contract the AI helped them draft. One clause reads oddly to you. You:',
 '[{"id":"a","text":"Sign — refusing looks difficult"},
   {"id":"b","text":"Check the clause against a trusted template or someone qualified before signing"},
   {"id":"c","text":"Ask the client''s AI whether the clause is fair"},
   {"id":"d","text":"Cross it out and sign the rest"}]',
 'b',
 'Anything legally binding gets verified against real authority — the same ladder as every consequential claim.'),

('a0000000-0000-4000-8000-000000000002', 9, 'tools',
 'A client wants weekly minutes from their recorded 90-minute team calls. Your pipeline is:',
 '[{"id":"a","text":"Play the recording and paste what you hear into chat as you go"},
   {"id":"b","text":"Transcription tool → templated AI summary → your review of names, numbers, commitments → deliver within hours"},
   {"id":"c","text":"Ask the client to keep their own notes and send them over"},
   {"id":"d","text":"Upload the video to a chatbot and ask for minutes"}]',
 'b',
 'Purpose-built transcription, templated summarisation, human verification — each stage doing the job it''s shaped for.'),

('a0000000-0000-4000-8000-000000000002', 10, 'workflow',
 'AI has cut your monthly-report time from 4 hours to 1. You bill that client hourly. The sustainable move is:',
 '[{"id":"a","text":"Say nothing and bill 4 hours anyway"},
   {"id":"b","text":"Bill the 1 hour and absorb the pay cut"},
   {"id":"c","text":"Propose fixed deliverable pricing for the report, reflecting its value and your verification process"},
   {"id":"d","text":"Slow down so it takes 4 hours again"}]',
 'c',
 'Billing phantom hours is dishonest; absorbing the cut punishes your own efficiency. Deliverable pricing aligns pay with value — and it''s honest.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000002'
);

-- AI Foundations exam — 8 questions
insert into public.questions (assessment_id, sort_order, competency, prompt, options, correct_option_id, explanation)
select v.assessment_id::uuid, v.sort_order, v.competency, v.prompt, v.options::jsonb, v.correct, v.explanation
from (values

('a0000000-0000-4000-8000-000000000003', 1, 'prompting',
 'Which prompt gets the most usable first draft?',
 '[{"id":"a","text":"\"Write a resignation letter\""},
   {"id":"b","text":"\"Write a respectful 150-word resignation letter for a customer service role, last day March 15, thanking the team, no reasons given\""},
   {"id":"c","text":"\"Write a letter\""},
   {"id":"d","text":"\"You are the world''s best writer. Write a resignation letter.\""}]',
 'b',
 'Context, constraints, and format — the four-part briefing — beat both vagueness and flattery.'),

('a0000000-0000-4000-8000-000000000003', 2, 'prompting',
 'AI gave you a decent draft but it''s twice too long and too formal. Your next prompt:',
 '[{"id":"a","text":"\"Make it better\""},
   {"id":"b","text":"\"Cut this to under 100 words and make it conversational — like a message to a helpful workmate\""},
   {"id":"c","text":"Start over in a new chat"},
   {"id":"d","text":"\"Why is this so bad?\""}]',
 'b',
 'Specific, actionable revision instructions. Vague dissatisfaction produces vague changes.'),

('a0000000-0000-4000-8000-000000000003', 3, 'tools',
 'You have a 2-hour recorded lecture to study from. The efficient approach is:',
 '[{"id":"a","text":"Ask a chatbot what the lecture probably covered"},
   {"id":"b","text":"Transcribe it, then have AI summarise the transcript into study notes you check against the parts that matter"},
   {"id":"c","text":"Re-watch it three times taking notes"},
   {"id":"d","text":"Skip it — recordings can''t be studied efficiently"}]',
 'b',
 'Transcription first, then summarise real text. A chatbot guessing at content it never saw is invention, not studying.'),

('a0000000-0000-4000-8000-000000000003', 4, 'tools',
 'Halfway through pasting a long document, the AI starts ignoring your instructions from the beginning. This means:',
 '[{"id":"a","text":"The tool is broken today — try again tomorrow"},
   {"id":"b","text":"You''ve exceeded what it can hold at once — work in sections, repeating the instruction each time"},
   {"id":"c","text":"The document is too advanced for AI"},
   {"id":"d","text":"You need to type the instruction in capital letters"}]',
 'b',
 'Context limits are invisible until you hit them. Chunking with repeated instructions is the standard workaround.'),

('a0000000-0000-4000-8000-000000000003', 5, 'workflow',
 'You post similar job applications several times a week. The AI-era habit is:',
 '[{"id":"a","text":"Write each one fresh — effort shows"},
   {"id":"b","text":"One strong template with slots for company, role, and your matching experience; AI fills and adapts per posting, you review"},
   {"id":"c","text":"One generic letter sent everywhere unchanged"},
   {"id":"d","text":"Let AI write each one from scratch with no template"}]',
 'b',
 'Build once, reuse with judgment. The template carries your quality; the review keeps each application honest and specific.'),

('a0000000-0000-4000-8000-000000000003', 6, 'judgment',
 'AI tells you a scholarship application closes "March 30" and lists requirements. Before acting, you:',
 '[{"id":"a","text":"Start preparing the listed requirements immediately"},
   {"id":"b","text":"Check the scholarship provider''s official page — dates and requirements — and work from that"},
   {"id":"c","text":"Ask the AI to double-check itself"},
   {"id":"d","text":"Ask in a Facebook group whether the date is right"}]',
 'b',
 'Deadlines and requirements are exactly the class of fact AI invents fluently. The official source is the only source.'),

('a0000000-0000-4000-8000-000000000003', 7, 'judgment',
 'Which of these should NEVER be pasted into an AI tool?',
 '[{"id":"a","text":"A paragraph from a public news article"},
   {"id":"b","text":"Your one-time banking code, to ask what it''s for"},
   {"id":"c","text":"Your own resume"},
   {"id":"d","text":"Notes from your own class lecture"}]',
 'b',
 'Credentials, OTPs, card and ID numbers: no legitimate task needs them, and no tool should ever see them.'),

('a0000000-0000-4000-8000-000000000003', 8, 'workflow',
 'The honest one-line summary of working well with AI is:',
 '[{"id":"a","text":"AI does the work; you take the credit"},
   {"id":"b","text":"AI drafts and accelerates; you verify, decide, and stay accountable"},
   {"id":"c","text":"AI can''t be trusted with anything that matters"},
   {"id":"d","text":"Whoever has the best AI subscription wins"}]',
 'b',
 'The course''s one rule. Tools change; the division of labour — machine speed, human judgment — is the durable skill.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000003'
);

-- ════════════════════════════════════════════════════════════════════════════
-- Demo credentials — OBVIOUSLY FICTIONAL, marked as demo records (§7 seed).
-- Sequences seeded past them so real issuance never collides.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.credentials
  (id, credential_code, user_id, certification_id, holder_name, title, level, issued_at, status, competencies)
values
('f0000000-0000-4000-8000-000000000001', 'CAVA-2026-000001', null,
 'c0000000-0000-4000-8000-000000000001',
 'Juana Dela Cruz (Demo Record)', 'Certified AI Virtual Assistant', 'professional',
 '2026-08-01T04:00:00Z', 'active',
 '[{"key":"workflow","label":"Workflow integration","score":90},{"key":"prompting","label":"Prompting & output quality","score":85},{"key":"tools","label":"Tool fluency","score":80},{"key":"judgment","label":"Judgment & verification","score":95}]'),
('f0000000-0000-4000-8000-000000000002', 'CAVA-2026-000002', null,
 'c0000000-0000-4000-8000-000000000001',
 'Marco Bayani (Demo Record)', 'Certified AI Virtual Assistant', 'professional',
 '2026-08-05T04:00:00Z', 'active',
 '[{"key":"workflow","label":"Workflow integration","score":80},{"key":"prompting","label":"Prompting & output quality","score":90},{"key":"tools","label":"Tool fluency","score":85},{"key":"judgment","label":"Judgment & verification","score":85}]'),
('f0000000-0000-4000-8000-000000000003', 'AIF-2026-000001', null,
 'c0000000-0000-4000-8000-000000000002',
 'Liway Magiting (Demo Record)', 'AI Foundations Certificate', 'foundation',
 '2026-08-10T04:00:00Z', 'active',
 '[{"key":"prompting","label":"Prompting & output quality","score":88},{"key":"tools","label":"Tool fluency","score":75},{"key":"workflow","label":"Workflow integration","score":75},{"key":"judgment","label":"Judgment & verification","score":88}]')
on conflict (credential_code) do nothing;

insert into public.credential_sequences (prefix, year, last_seq) values
('CAVA', 2026, 2),
('AIF', 2026, 1)
on conflict (prefix, year) do nothing;
