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

-- Short Guides use the same publishing system as the blog, but render in
-- their own searchable public section.
insert into public.posts
  (id, slug, title, excerpt, category, cover_image_url, author_name, status, published_at, content_type, disclosure, content_mdx)
values
(
  'b0000000-0000-4000-8000-000000000003',
  'how-to-use-fundedxyz',
  'How to Use FundedXyz',
  'A beginner-friendly walkthrough from creating an account to opening the trading platform and checking your account rules before a first trade.',
  'Cryptocurrency (Crypto)',
  '/short-guides/fundedxyz-cover.svg',
  'GN Academy',
  'published',
  '2026-08-27T02:00:00Z',
  'short_guide',
  'This independent guide is for education only. GN Academy is not affiliated with FundedXyz. Its platform involves simulated crypto trading and financial risk. Check the official rules and fees before paying or trading.',
  E'FundedXyz is a crypto proprietary trading platform. It offers several ways to access a simulated trading account, each with different objectives, loss limits, fees, and payout conditions. This guide shows where to start and what to verify. It does not recommend a plan or teach a trading strategy.\n\nThe operator states that FundedXyz is a simulated trading platform. Read the current [FundedXyz rules](https://www.fundedxyz.com/faq) and [pricing page](https://www.fundedxyz.com/pricing) yourself before paying. The rules shown in your checkout and dashboard take priority over any summary, including this one.\n\n## Quick summary\n\nIn this guide, you will:\n\n1. Create a FundedXyz account.\n2. Compare X, Y, and Z Mode at a high level.\n3. Select an account size and review its rules.\n4. Complete checkout.\n5. Find the account objectives in your dashboard.\n6. Open the trading platform and check the order screen.\n\n## 1. Create your account\n\nOpen the official [FundedXyz trader portal](https://app.fundedxyz.com/login). Choose the sign-up option, enter an email address you control, and create a unique password. Complete any email verification the portal requests, then sign in.\n\nUse the official domain directly. Do not create an account through a link sent by an unknown person, and never share a password or one-time verification code.\n\n![Icon: creating an account](/short-guides/icon-signup.svg)\n\n## 2. Understand the three modes\n\nFundedXyz currently presents three main paths.\n\n- **X Mode** is described as instant funding. There is no evaluation profit target before access, but account-level loss, position, order, and withdrawal rules still apply.\n- **Y Mode** uses an evaluation. A trader must meet the stated target without breaking the loss rules before moving to the funded stage.\n- **Z Mode** uses an evaluation tied to a fixed scholarship-style payout. The official FAQ says it does not issue a funded account after completion.\n\nThese products can change. Compare the live cards on the [official pricing page](https://www.fundedxyz.com/pricing), not a screenshot or an old social-media post.\n\n## 3. Choose an account size and read every objective\n\nAfter selecting a mode, choose an available account size. Before continuing, write down the values shown for your exact option:\n\n- Profit target, if the mode has one\n- Maximum overall loss\n- Maximum daily loss\n- Available trading pairs\n- Leverage and position limits\n- Minimum or maximum trading-day rules\n- Profit split or scholarship amount\n- Payout minimum and timing\n- One-time fee and refund conditions\n\nDo not assume that two account sizes or modes use the same rules. A lower entry fee can come with tighter limits. If a term is unclear, ask official support before checkout.\n\n![Icon: reviewing account rules and objectives](/short-guides/icon-checklist.svg)\n\n## 4. Review checkout before paying\n\nThe checkout summary should match the mode and account size you selected. Check the fee, currency, discount, and final amount before entering payment details. Keep the receipt and a copy of the rules that applied when you purchased.\n\nA prop-trading fee pays for access under a set of rules. It is not a deposit into a personal brokerage account, and it does not guarantee a payout.\n\n## 5. Find the account in your dashboard\n\nAfter checkout is confirmed, return to the trader portal and open the new account. Locate the dashboard area that shows the account identifier, starting balance, current equity, profit target, daily loss, and maximum loss.\n\nCheck that these values match the plan you purchased. If they do not, stop and contact support before opening a position. Save the account identifier somewhere private, but never publish login details or access credentials.\n\n## 6. Open the trading platform\n\nUse the platform link or credentials provided inside the authenticated dashboard. Confirm that you are viewing the correct account before doing anything else.\n\nOn the trading screen, find:\n\n- The account name or identifier\n- Balance and equity\n- The list of supported trading pairs\n- The order ticket\n- Current open orders and positions\n- The place where a position can be closed\n\nThe exact screen may change, so use the labels in your live account rather than relying on the position of a button in an older guide.\n\n![Icon: an exchange trading chart](/short-guides/icon-chart.svg)\n\n## 7. Pause before the first order\n\nBefore placing an order, compare its size and potential loss with the account rules. Check the pair, order type, entry price, quantity, leverage, and exit controls. FundedXyz says some modes have specific entry-order and position-risk restrictions, so confirm the current rule for your mode first.\n\nThis guide stops here deliberately. Choosing a market direction, position size, or strategy is a financial decision and is outside the scope of a platform walkthrough.\n\n## Where to get current help\n\nUse the [official FundedXyz FAQ](https://www.fundedxyz.com/faq) for current definitions and support routes. Keep written copies of any answer that changes how you understand an account rule.\n\nGN Academy is not affiliated with FundedXyz and receives no referral payment from the links in this guide. This material is educational, not financial advice. Crypto trading and paid evaluation programs involve substantial risk, and you may lose the fee or fail an account.'
),
(
  'b0000000-0000-4000-8000-000000000004',
  'how-to-use-bitunix-pro-mobile-version',
  'How to Use Bitunix Pro (Mobile Version)',
  'A step-by-step walkthrough for setting up a Bitunix Pro account on mobile, from downloading the app to completing identity verification.',
  'Cryptocurrency (Crypto)',
  '/short-guides/bitunix-cover.svg',
  'GN Academy',
  'published',
  '2026-08-27T02:00:00Z',
  'short_guide',
  'This independent guide is for education only. GN Academy is not affiliated with Bitunix and receives no referral payment from this guide. Cryptocurrency trading involves substantial risk. Review Bitunix''s official terms, fees, and security practices before creating an account or trading.',
  E'Bitunix Pro is the mobile app for Bitunix, a centralized cryptocurrency exchange that offers spot trading, futures trading, and basic wallet management from a phone. This guide walks through creating an account and getting oriented in the app. It does not cover trading strategy, and it is not a recommendation to trade.\n\nRead Bitunix''s own terms of service and fee schedule before creating an account or funding it. The rules shown inside the app and at checkout take priority over any summary, including this one.\n\n## Quick summary\n\nIn this guide, you will:\n\n1. Download the Bitunix Pro app.\n2. Start the sign-up process.\n3. Register with an email address or mobile number.\n4. Create a secure password and set up two-factor authentication.\n5. Verify your email or phone number.\n6. Complete identity verification if the app asks for it.\n\n## What is Bitunix Pro?\n\nBitunix Pro is a mobile trading app for a centralized cryptocurrency exchange. Users can buy and sell crypto, trade spot and futures markets, and manage a custodial wallet from the app. Centralized here means Bitunix holds custody of funds on a user''s behalf, similar to other major exchange apps, rather than a wallet the user alone controls.\n\n## Step 1: Download the app\n\nInstall Bitunix Pro from the Apple App Store or Google Play Store. Confirm the developer name and app icon match Bitunix''s official listing before installing, since lookalike apps do exist on both stores.\n\n![Icon: downloading the Bitunix Pro app](/short-guides/icon-download.svg)\n\n## Step 2: Start sign-up\n\nOpen the app and tap **Sign up**. The app will ask whether you are creating a new account or logging into an existing one.\n\n## Step 3: Register with your email or mobile number\n\nChoose email or mobile number as your registration method, then enter it. If someone referred you, there is usually an optional referral code field; leaving it blank does not block sign-up. Read and agree to Bitunix''s user agreement and privacy policy before continuing, rather than skimming past it.\n\n## Step 4: Create a secure password\n\nChoose a password that is unique to this account and meets Bitunix''s complexity rules (a mix of numbers, upper and lower case letters, and length). Do not reuse a password from another account. Immediately after registration, look in account settings for two-factor authentication (2FA) and turn it on: it is the single most effective step against someone else accessing the account.\n\n![Icon: setting a password and turning on two-factor authentication](/short-guides/icon-password.svg)\n\n## Step 5: Verify your account\n\nBitunix sends a verification code to the email address or phone number used at sign-up. Enter that code in the app to confirm you control it. Never share this code with anyone, including someone claiming to be Bitunix support.\n\n![Icon: verifying a code sent to your email or phone](/short-guides/icon-verify.svg)\n\n## Step 6: Complete identity verification\n\nBefore trading or withdrawing meaningful amounts, most exchanges, including Bitunix, require identity verification (KYC): a government-issued ID and sometimes a selfie or proof of address. Requirements can change and vary by region, so follow whatever the app currently asks for and only submit documents inside the official app.\n\n![Icon: submitting an identity document for verification](/short-guides/icon-id.svg)\n\n## Before your first trade\n\nOnce verification is complete, take a moment to find the main account screen: balance, deposit and withdrawal options, and the spot and futures trading tabs. Compare any fee shown on screen with Bitunix''s published fee schedule before placing an order. This guide stops here deliberately: choosing what to trade, how much, and when is a financial decision outside the scope of a sign-up walkthrough.\n\n## Where to get official help\n\nUse Bitunix''s official app support or website for current fees, verification requirements, and security settings. Treat any offer of guaranteed returns, or any request to move funds outside the app, as a scam regardless of who sends it.'
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
 'You''re a VA replying to a client''s customer on their behalf. Your first prompt, "write a polite reply to this email", produced something generic that doesn''t sound like the business at all. What''s the better next move?',
 '[{"id":"a","text":"Accept it and heavily edit it yourself, since AI can''t do tone"},
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
   {"id":"b","text":"Define the format once (fields, tone, length, example), then run every item through that same template"},
   {"id":"c","text":"Let the AI choose the best format per item; variety reads better"},
   {"id":"d","text":"Write five yourself, then tell the AI to \"continue in the same style\" without showing it the format rules"}]',
 'b',
 'A written template turns 30 unpredictable outputs into 30 consistent ones, and it''s reusable when the client adds products next month.'),

('a0000000-0000-4000-8000-000000000001', 4, 'prompting',
 'Your manager asked for a status update. The AI draft is four paragraphs and the one thing that matters, a deadline slipping, is buried in the middle. What do you do?',
 '[{"id":"a","text":"Send it, since everything is technically in there"},
   {"id":"b","text":"Reply \"make it shorter\" and send whatever comes back"},
   {"id":"c","text":"Re-prompt with a hard structure: lead with the risk, then three bullets, each under 15 words"},
   {"id":"d","text":"Give up on AI for anything a manager will read"}]',
 'c',
 'Vague fix requests get vague fixes. Specifying the structure (what leads, how many bullets, how long) makes the output match how the reader reads.'),

('a0000000-0000-4000-8000-000000000001', 5, 'tools',
 'A client hands you 200 PDF invoices and wants the totals and dates in a spreadsheet by Friday. What''s the right setup?',
 '[{"id":"a","text":"Paste each PDF into a chatbot one at a time and copy the answers over"},
   {"id":"b","text":"Use a tool built for document data extraction, then spot-check a sample of rows yourself"},
   {"id":"c","text":"Type them in manually, because it''s the only way to be sure"},
   {"id":"d","text":"Tell the client it needs special enterprise software they should buy"}]',
 'b',
 'Chat is the wrong shape for 200 repetitive extractions. Purpose-built extraction plus a human spot-check is faster and more accurate than either extreme.'),

('a0000000-0000-4000-8000-000000000001', 6, 'tools',
 'Your freelance package for a client covers weekly social posts: writing captions, sizing images, and scheduling. How do you tool this?',
 '[{"id":"a","text":"One AI chatbot for all three jobs: captions, images, and posting"},
   {"id":"b","text":"AI for caption drafts, a design template tool for images, a scheduler for posting"},
   {"id":"c","text":"Everything manual, because mixing tools creates mistakes"},
   {"id":"d","text":"Ask the client to buy an all-in-one marketing suite before starting"}]',
 'b',
 'Fluency means matching each job to the tool shaped for it. A chatbot drafts well, but it doesn''t crop images or post on schedule.'),

('a0000000-0000-4000-8000-000000000001', 7, 'tools',
 'You attend your US client''s 2 a.m. team call, recorded, and need to circulate minutes with action items. The efficient approach?',
 '[{"id":"a","text":"Replay the recording and type notes as you listen"},
   {"id":"b","text":"Run the recording through transcription, have AI draft minutes and action items from the transcript, then review before sending"},
   {"id":"c","text":"Ask someone else on the call for their notes"},
   {"id":"d","text":"Send the raw recording link so people can watch it themselves"}]',
 'b',
 'Transcribe → summarise → human review is the standard pipeline. The review step is part of the answer, not optional.'),

('a0000000-0000-4000-8000-000000000001', 8, 'tools',
 'You paste a client''s 80-page report into a free chatbot and the answers about later chapters come back vague or wrong. What''s going on, and what do you do?',
 '[{"id":"a","text":"The tool has a limit on how much it can hold, so work through the report in sections with the same instruction each time"},
   {"id":"b","text":"The report is too complicated for AI, so summarise it by hand"},
   {"id":"c","text":"Ask the chatbot to \"please remember the whole document\" and try again"},
   {"id":"d","text":"Wait a few hours, since limits reset and it will read the rest"}]',
 'a',
 'Long inputs silently fall out of a model''s working context. Knowing that limit exists, and chunking around it, separates users from operators.'),

('a0000000-0000-4000-8000-000000000001', 9, 'workflow',
 'Your client asks for a weekly summary of about 40 customer support emails, every Friday. You''ve been pasting them into ChatGPT one at a time. What''s the better move?',
 '[{"id":"a","text":"Keep the same method but paste faster"},
   {"id":"b","text":"Build a reusable prompt template with a fixed output format and run the whole week''s emails as one batch"},
   {"id":"c","text":"Ask ChatGPT to work faster"},
   {"id":"d","text":"Tell the client a weekly summary isn''t possible"}]',
 'b',
 'The task repeats weekly, so the setup should be built once and reused: a template plus batching turns an afternoon of pasting into one run.'),

('a0000000-0000-4000-8000-000000000001', 10, 'workflow',
 'Every new client gets the same 5-email onboarding sequence from you, lightly personalised. You currently rewrite all five each time. Better system?',
 '[{"id":"a","text":"Keep rewriting from scratch, because clients can tell when it''s not fully handmade"},
   {"id":"b","text":"Save the sequence as templates with slots for name, service, and dates; spend your time only on the parts that genuinely differ"},
   {"id":"c","text":"Have AI freestyle the whole sequence per client for maximum variety"},
   {"id":"d","text":"Send every client identical emails with no personalisation"}]',
 'b',
 'Systemise the 80% that repeats, keep human effort for the 20% that differs. That''s the core pattern of AI-era workflow design.'),

('a0000000-0000-4000-8000-000000000001', 11, 'workflow',
 'Your daily report takes 45 minutes: pull numbers from three dashboards, paste into a doc, write a summary. Where does AI genuinely fit?',
 '[{"id":"a","text":"Let AI estimate the numbers too, since close enough is fine for a daily"},
   {"id":"b","text":"You keep pulling and checking the numbers; AI turns them into the summary using a fixed format you defined"},
   {"id":"c","text":"Ask AI to write the whole report from what it remembers about your company"},
   {"id":"d","text":"Nowhere, because reports are too important to involve AI"}]',
 'b',
 'Split the task by what each side is good at: humans own the facts, AI owns the formatting and prose. Letting AI supply facts is how reports go wrong.'),

('a0000000-0000-4000-8000-000000000001', 12, 'workflow',
 'A client asks if you can add competitor research to your VA services. You''ve never offered it. What do you do?',
 '[{"id":"a","text":"Decline, and only take work you already know end to end"},
   {"id":"b","text":"Accept, have AI generate the research, and deliver it as-is under your name"},
   {"id":"c","text":"Accept: use AI to structure the work and draft findings, verify every claim against real sources yourself, and be straight with the client about your process"},
   {"id":"d","text":"Accept and do it fully manually, however long it takes"}]',
 'c',
 'AI expands what you can credibly take on, so long as you stay the one accountable for accuracy. Delivering unverified AI output under your name is how VAs lose clients.'),

('a0000000-0000-4000-8000-000000000001', 13, 'judgment',
 'AI gives you a confident statistic about Philippine freelance rates for a client proposal. What do you do first?',
 '[{"id":"a","text":"Use it, because it sounded specific"},
   {"id":"b","text":"Ask the AI if it''s sure"},
   {"id":"c","text":"Verify it against a primary source before it reaches the client"},
   {"id":"d","text":"Rewrite it in your own words and use it"}]',
 'c',
 'Models produce confident numbers whether or not they''re real, and asking the model to double-check itself isn''t verification. Only a primary source is.'),

('a0000000-0000-4000-8000-000000000001', 14, 'judgment',
 'You asked AI to draft a payment-terms clause for your freelance contract, and it produced something that reads impressively legal. Before you put it in a contract you''ll sign?',
 '[{"id":"a","text":"Use it, because it clearly knows contract language"},
   {"id":"b","text":"Check it against a trusted contract template or have someone qualified look at it"},
   {"id":"c","text":"Reword it so it sounds more like you"},
   {"id":"d","text":"Ask the AI to add more protective clauses to be safe"}]',
 'b',
 'Sounding legal and being enforceable are different things. Anything you''re legally bound by deserves a check against a source that carries real authority.'),

('a0000000-0000-4000-8000-000000000001', 15, 'judgment',
 'AI tells you that freelancers must file a specific BIR form you''ve never heard of, with a deadline next week. What''s the right response?',
 '[{"id":"a","text":"File it immediately, because better safe than sorry"},
   {"id":"b","text":"Check the BIR''s official website or hotline before acting"},
   {"id":"c","text":"Ask the AI for its source, and trust the answer it gives"},
   {"id":"d","text":"Ignore it, because AI makes tax stuff up"}]',
 'b',
 'Government requirements change and models hallucinate both forms and deadlines. A model quoting a source is not the same as the source existing, so go to the authority itself.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  -- Scoped to the scored questions specifically (not "any row"), so the
  -- non-scored intent question from migration 0011 — which runs before this
  -- seed on a fresh install — never blocks these 15 from being seeded.
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000001'
    and competency <> 'intent'
);

-- ════════════════════════════════════════════════════════════════════════════
-- Certifications
-- ════════════════════════════════════════════════════════════════════════════

insert into public.certifications
  (id, slug, title, subtitle, level, category, format, summary, description,
   skills, outcomes, roles, price_php, is_free, passing_score,
   credential_prefix, sort_order, is_published, requires_assignment)
values
(
  'c0000000-0000-4000-8000-000000000001',
  'certified-ai-virtual-assistant',
  'Certified AI Virtual Assistant',
  'Run client operations with AI, then prove it',
  'professional', 'Virtual assistance', 'Self-paced online',
  'The professional standard for VAs who use AI as a working tool, not a novelty. Nine practical lessons, three chapter quizzes, a reviewed final assignment, and a publicly verifiable credential.',
  'Clients don''t pay for "knows ChatGPT". They pay for inboxes handled, reports delivered, and judgment they can trust. This certification covers the three things AI-era VAs are actually hired for: running client operations with AI in the loop, producing client-ready communication at speed, and knowing when not to trust the machine. Every lesson is built around real VA scenarios, and the final assignment is a reviewed case file, not a multiple-choice quiz: a human checks your voice brief, your report, your judgment on a flawed transcript, and your reasoning on privacy and pricing before the credential issues. Pass it and your credential gets a public verification page any client can check in seconds.',
  array['AI-assisted inbox management','Prompt templates','Meeting-notes pipelines','Client-voice writing','Output verification','Confidentiality practice'],
  array['Set up reusable AI workflows for recurring client tasks','Produce client-ready drafts in the client''s voice','Verify AI output before it reaches a client','Scope and price AI-assisted services honestly'],
  array['Virtual assistant','Executive assistant','Freelance operations support'],
  1499, false, 70,
  'CAVA', 1, true
  , true
),
(
  'c0000000-0000-4000-8000-000000000002',
  'ai-foundations',
  'AI Foundations Certificate',
  'The free starting point: no payment, no catch',
  'foundation', 'Foundations', 'Self-paced online',
  'A free certificate course covering exactly what the AI Readiness Test measures: prompting, tools, workflow, and judgment, all built for Filipino work contexts.',
  'If your AI Readiness result said Beginner or Developing, this is the gap-closer. Five short lessons take you from "I chat with AI sometimes" to a working method: how to brief AI like a colleague, pick the right tool for a task, build a repeatable workflow, and catch confident nonsense before it costs you. Finish the lessons, pass the free exam, and earn a verifiable certificate: your first entry on the credential ladder.',
  array['Prompting fundamentals','Tool selection','Basic AI workflows','Output verification'],
  array['Brief AI with context, constraints, and format','Choose the right tool for a task instead of defaulting to chat','Turn a repeating task into a reusable workflow','Verify AI claims against real sources'],
  array['Students','Jobseekers','Anyone starting with AI'],
  null, true, 70,
  'AIF', 0, true
  , false
)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Modules and lessons
-- ════════════════════════════════════════════════════════════════════════════

insert into public.modules (id, certification_id, title, description, sort_order) values
('d0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000001',
 'AI-powered client operations', 'The recurring work every VA is hired for (inbox, calendar, meetings), rebuilt with AI in the loop.', 1),
('d0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000001',
 'Content and communication', 'Producing client-ready writing at speed without losing the client''s voice.', 2),
('d0000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000001',
 'Professional judgment', 'The part clients actually pay a premium for: knowing when not to trust the machine.', 3),
('d0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000002',
 'Working with AI', 'What AI is actually good at, and how to brief it so it delivers.', 1),
('d0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000002',
 'Working safely', 'Verification and privacy: the habits that keep AI from costing you a job or a client.', 2)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, slug, content_mdx, duration_minutes, sort_order, is_preview) values

-- CAVA · Module 1
('e0000000-0000-4000-8000-000000000111', 'd0000000-0000-4000-8000-000000000101',
 'Inbox and email workflows with AI', 'inbox-workflows',
 E'# Inbox and email workflows with AI\n\nAn inbox is a queue of small decisions, and most of them repeat. The VAs who scale are the ones who stop treating each email as a fresh problem.\n\n## The triage-first method\n\nBefore AI writes anything, it can *sort*. A daily triage prompt with fixed categories (needs reply today, needs the client''s decision, FYI only, spam) turns forty unread emails into four short lists.\n\n- Keep the categories stable; changing them daily breaks the habit\n- Always include "needs the client''s decision", because guessing on their behalf is how trust dies\n- Spot-check the sorting for the first two weeks before you rely on it\n\n## A real triage prompt\n\nThis is a full prompt you could paste today, categories and all:\n\n> "Sort the emails below into exactly one category each: NEEDS REPLY TODAY, NEEDS CLIENT DECISION, FYI ONLY, or SPAM. Output a table with columns: sender, subject, category, one-line reason. Do not draft replies, only sort. Treat anything mentioning a refund, a complaint, or a legal threat as NEEDS CLIENT DECISION even if it looks minor. Here are today''s emails: [paste emails]"\n\nNotice what it does: fixed categories, a fixed output shape, and one explicit safety rule (refunds and complaints escalate) so the sorting stays conservative on the calls that matter.\n\n## Drafting replies\n\nBuild one reply template per *type* of email the client receives, not per email. Each template carries the client''s tone, sign-off, and boundaries (what you may promise, what you may not). The AI fills the specifics; you verify anything factual before sending.',
 12, 1, true),

('e0000000-0000-4000-8000-000000000112', 'd0000000-0000-4000-8000-000000000101',
 'Calendar and scheduling systems', 'calendar-systems',
 E'# Calendar and scheduling systems\n\nScheduling across time zones is where VAs earn quiet loyalty, and where a single AM/PM slip costs a client a sales call.\n\n## Let AI compute, you confirm\n\nAI is good at the conversion arithmetic ("2 pm Tuesday in Chicago is 3 am Wednesday in Manila") and bad at knowing which meetings matter. Use it to draft options, never to send invites unreviewed.\n\n- Keep the client''s scheduling rules in one written brief: buffer times, no-meeting blocks, priority contacts\n- Paste that brief into every scheduling prompt, because context beats memory\n- Confirm the final time in BOTH time zones in the confirmation email, every time\n\nThe double-time-zone confirmation line is a professional habit that costs five seconds and has saved more client relationships than any tool.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000113', 'd0000000-0000-4000-8000-000000000101',
 'Meeting notes and minutes pipelines', 'minutes-pipelines',
 E'# Meeting notes and minutes pipelines\n\nA recorded call plus a transcription tool plus a summary prompt is a pipeline: set it up once and every meeting flows through it.\n\n## The three-stage pipeline\n\n1. **Transcribe** the recording with a transcription tool (not a chat window)\n2. **Summarise** with a fixed template: decisions made, action items with owners and dates, open questions\n3. **Review**: you, not the AI, check names, numbers, and commitments against the transcript\n\nStage 3 is not optional. Transcripts garble Filipino and English name spellings constantly, and an action item assigned to the wrong person creates real damage.\n\nDeliver minutes within two hours of the call while context is fresh. With the pipeline, that''s ten minutes of your attention.',
 10, 3, false),

-- CAVA · Module 2
('e0000000-0000-4000-8000-000000000121', 'd0000000-0000-4000-8000-000000000102',
 'Client-voice writing with templates', 'client-voice-writing',
 E'# Client-voice writing with templates\n\nEvery client has a voice, and generic AI output has none. The bridge is a **voice brief**: a half-page document you write once per client.\n\n## What goes in a voice brief\n\n- Three real examples of the client''s own writing\n- Tone words they''d agree with ("warm but direct", "no exclamation points")\n- Words and phrases they never use\n- How they open and close messages\n\nPaste the brief into any writing prompt and the drafts start sounding like *them*. Update it when the client corrects you, since every correction is voice data.\n\n## A worked voice brief\n\nHere is one, in full, for an invented client who sells home-baked goods online:\n\n> **Voice brief: Dina''s Home Bakes**\n> Tone words: warm, plainspoken, a little playful\n> Never use: "Dear valued customer", "as per my last message", any exclamation point after the first line\n> Opens with: the customer''s first name, one line acknowledging exactly what they asked\n> Closes with: "Thank you po," then Dina''s first name, no formal sign-off block\n\nThat''s the whole document. Pasted into a prompt, it turns a generic "your order will arrive Friday" into something that sounds like Dina actually typed it herself.\n\nA VA with voice briefs for five clients can switch between them in seconds. That''s a service no generic chatbot user can offer.',
 12, 1, false),

('e0000000-0000-4000-8000-000000000122', 'd0000000-0000-4000-8000-000000000102',
 'Social and marketing support', 'social-marketing-support',
 E'# Social and marketing support\n\nMarketing support is batch work, and batch work is where AI multiplies you, provided the format is fixed.\n\n## Batch, don''t improvise\n\nA month of captions produced in one sitting from one template beats thirty daily improvisations: consistent voice, consistent hashtags, and the client approves everything at once.\n\n- Define the caption template: hook, body, call to action, hashtag set\n- Generate the month, then edit as a batch: repetitive AI phrasing is obvious when you read thirty in a row, invisible when you read one a day\n- Keep a "used hooks" list so months don''t repeat themselves\n\nSend the batch for approval in one document. Clients notice when review takes them ten minutes instead of a message thread every morning.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000123', 'd0000000-0000-4000-8000-000000000102',
 'Reports clients actually read', 'reports-clients-read',
 E'# Reports clients actually read\n\nClients skim. A report''s job is to survive skimming.\n\n## Structure before prose\n\nThe unbreakable rule from the AI Readiness Test applies here: **you own the numbers, AI owns the prose.** Pull the real figures yourself, then let AI turn them into sentences using a fixed structure:\n\n1. One-line summary: what changed and whether it''s good\n2. Three bullets of what happened, most important first\n3. One line on what you''ll do next\n\nAnything longer goes in an appendix nobody is required to read.\n\n## A worked example\n\nSay this week you counted 52 inbox replies sent, 3 escalated to the client, and an average reply time of 2.5 hours against a 4-hour target. Fed into the structure, that becomes:\n\n> **Summary:** Inbox stayed ahead of target this week.\n> - Sent 52 replies, 3 escalated to you directly for a decision\n> - Average reply time was 2.5 hours, well inside the 4-hour target\n> - No tickets carried over past 24 hours\n> **Next step:** none needed, keep the current triage categories.\n\nEvery number there traces back to something counted, not estimated.\n\nNever let AI estimate, extrapolate, or "fill in" a number you didn''t supply. A report with one invented figure is worth less than no report, because the client no longer trusts the other figures either.',
 8, 3, false),

-- CAVA · Module 3
('e0000000-0000-4000-8000-000000000131', 'd0000000-0000-4000-8000-000000000103',
 'Verification before delivery', 'verification-before-delivery',
 E'# Verification before delivery\n\nAI states falsehoods with total confidence. Your value as a professional is the checkpoint between that confidence and your client.\n\n## The verification ladder\n\nMatch the effort to the stakes:\n\n- **Low stakes** (internal draft, brainstorm): skim for obvious nonsense\n- **Client-facing** (emails, posts, reports): check every name, number, date, and link\n- **Consequential** (contracts, legal or tax claims, statistics in proposals): verify against a primary source, or route to someone qualified\n\n"The AI said so" is never a defense a client accepts. If you can''t verify a claim, cut it or flag it. Delivering it unverified under your name converts an AI error into *your* error.',
 10, 1, false),

('e0000000-0000-4000-8000-000000000132', 'd0000000-0000-4000-8000-000000000103',
 'Data privacy and client confidentiality', 'privacy-confidentiality',
 E'# Data privacy and client confidentiality\n\nEvery paste into an AI tool is a disclosure decision. Most VAs never think about it once; certified ones think about it every time.\n\n## The paste test\n\nBefore pasting client material into any tool, ask: *would the client be comfortable seeing this exact text on my screen-share?*\n\n- Strip names, emails, amounts, and identifiers when the task doesn''t need them: "Customer A complained about late delivery" summarises as well as the real name\n- Never paste credentials, card numbers, or government IDs into anything, ever\n- Know whether your client has rules about AI tools, and ask once, in writing, early\n\nUnder the Philippines'' Data Privacy Act, mishandling personal data has legal weight. "The tool needed it" is not a lawful basis.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000133', 'd0000000-0000-4000-8000-000000000103',
 'Scoping and pricing AI-assisted work', 'scoping-pricing',
 E'# Scoping and pricing AI-assisted work\n\nAI makes you faster. Whether that raises or destroys your income depends entirely on how you price.\n\n## Price the outcome, not the hours\n\nIf a report used to take four hours and now takes one, hourly billing just cut your pay by 75% for the same value delivered. Move recurring AI-accelerated work to fixed deliverable pricing: *"weekly summary report, ₱X per month."*\n\n- Be honest that you use AI in your process, and equally clear that you verify everything personally\n- Charge for the judgment, the reliability, and the client-specific setup you''ve built; those don''t come with a chatbot subscription\n- When a client says "can''t AI just do that?", the answer is your verification ladder and voice briefs. Show the system, not the tool\n\nThe VAs who lose to AI are the ones selling typing. Sell operations.',
 10, 3, false),

-- AIF · Module 1
('e0000000-0000-4000-8000-000000000211', 'd0000000-0000-4000-8000-000000000201',
 'What AI can and can''t do for your work', 'what-ai-can-do',
 E'# What AI can and can''t do for your work\n\nAI language tools are pattern machines: astonishing at producing plausible text, structurally incapable of knowing whether that text is true.\n\n## Strong at\n\n- Drafting, rewriting, and summarising text you supply\n- Reformatting: messy notes into tables, bullets into paragraphs\n- Explaining concepts and generating options to react to\n\n## Weak at\n\n- Facts it wasn''t given, where it fills gaps with confident invention\n- Anything current: prices, laws, deadlines, news\n- Knowing your context unless you spell it out\n\nOne rule carries this whole course: **AI drafts, you decide.** Every lesson that follows is a specific application of it.',
 8, 1, true),

('e0000000-0000-4000-8000-000000000212', 'd0000000-0000-4000-8000-000000000201',
 'Prompting fundamentals', 'prompting-fundamentals',
 E'# Prompting fundamentals\n\nThe quality of AI output tracks the quality of the briefing, the same way a work request to a colleague does.\n\n## Brief it like a colleague\n\nA useful prompt carries four things:\n\n1. **Role & context**: who is this for, what''s the situation\n2. **Task**: the specific thing to produce\n3. **Constraints**: length, tone, what to avoid\n4. **Format**: bullets? table? email? how many words?\n\n"Write a job application email" gets a template. "Write a 120-word application email for this posting [pasted], highlighting my two years of customer support experience, professional but not stiff" gets a draft you can actually send.\n\nWhen output disappoints, fix the briefing before blaming the tool. Re-read your prompt and ask which of the four parts is missing.\n\n## Now try it\n\nPick a message you actually need to send this week: a follow-up to an employer, a request to a landlord, a caption for a sale post. Write your own four-part prompt for it, then check it line by line against the checklist above: role and context, task, constraints, format. Add whichever part is missing before you use it.',
 10, 2, false),

('e0000000-0000-4000-8000-000000000213', 'd0000000-0000-4000-8000-000000000201',
 'Choosing the right tool for the task', 'choosing-tools',
 E'# Choosing the right tool for the task\n\nChat is the default AI interface, not the universal one. Reaching for the right shape of tool is a skill employers notice.\n\n## Match tool to task\n\n- **Conversation & drafting** → chat assistants\n- **Long documents** → tools built for document upload, or work in sections\n- **Repetitive extraction** (invoices, forms) → extraction tools, not chat\n- **Audio & video** → transcription first, then summarise the transcript\n- **Images** → design template tools; chatbots don''t crop or resize\n\nLong documents fail for a specific reason: every AI tool has a context window, a hard limit on how much text it can hold in mind at once. Push past it and the tool doesn''t warn you, it just starts quietly forgetting your earliest instructions while still answering fluently. That''s why the fix is working in sections and repeating your instruction each time, not hoping the tool remembers.\n\nTwo habits: check whether a purpose-built tool exists before forcing chat to do everything, and learn the limits (length, file types, daily caps) of the free tiers you rely on. Hitting an invisible wall mid-deadline is preventable.\n\n## Now try it\n\nPick a task you did this week with chat by default: a long document, a batch of images, an audio recording. Name the tool from the list above that actually fits the shape of that task, and try it once instead of forcing chat to do everything.',
 8, 3, false),

-- AIF · Module 2
('e0000000-0000-4000-8000-000000000221', 'd0000000-0000-4000-8000-000000000202',
 'Verifying AI output', 'verifying-output',
 E'# Verifying AI output\n\nAI errors don''t look like errors. They arrive fluent, specific, and formatted exactly like the truth.\n\n## What always gets checked\n\nBefore AI text reaches anyone who matters (an employer, a client, a government office), verify:\n\n- **Names and titles**: misspelling a hiring manager''s name ends applications\n- **Numbers and dates**: salaries, deadlines, statistics, prices\n- **Claims of fact**: laws, requirements, "studies show..."\n- **Links**: AI invents URLs that look real and go nowhere\n\nVerification means checking a real source: the official website, the original document, the actual person. Asking the AI "are you sure?" is not verification. It will apologise and then be confidently wrong in a new direction.',
 8, 1, false),

('e0000000-0000-4000-8000-000000000222', 'd0000000-0000-4000-8000-000000000202',
 'Privacy basics for AI tools', 'privacy-basics',
 E'# Privacy basics for AI tools\n\nWhat you paste into an AI tool leaves your hands. Treat every paste as a small publication decision.\n\n## The rules that keep you safe\n\n- Never paste passwords, one-time codes, bank or card numbers, or government IDs, because no task needs them\n- Don''t paste other people''s personal details (a friend''s medical situation, a customer database) without their knowledge\n- At work, follow your employer''s AI rules, and if none exist, ask before pasting company documents\n- Prefer summarising sensitive material in your own anonymised words over pasting it raw\n\nThe Philippines'' Data Privacy Act protects personal data by law. Good privacy habits aren''t just self-protection. Handling other people''s data carelessly has real consequences.',
 8, 2, false)

on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- Certification exams (reuse the assessment engine)
-- ════════════════════════════════════════════════════════════════════════════

insert into public.assessments (id, certification_id, slug, title, type, passing_score, question_count, max_attempts, is_published) values
('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002',
 'ai-foundations-exam', 'AI Foundations Certificate Exam', 'knowledge', 70, 8, 3, true)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- CAVA chapter quizzes — formative, one per module, unlimited retakes.
--
-- Replaces the old single 10-question cava-knowledge-exam (removed by
-- migration 0013 on already-seeded databases): CAVA now issues its
-- credential through the reviewed assignment below, matching every other
-- paid course, so a scored final exam would be an ending that ends nothing.
-- The original 10 questions are redistributed by which module they actually
-- test; module 2 was left with only two, so one new question (sort_order 3)
-- was written to bring it to three, in the same style and difficulty.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.assessments (id, certification_id, module_id, slug, title, type, passing_score, question_count, max_attempts, is_published) values
('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101',
 'certified-ai-virtual-assistant-chapter-1', 'AI-powered client operations: chapter quiz', 'chapter', 70, 4, 99, true),
('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000102',
 'certified-ai-virtual-assistant-chapter-2', 'Content and communication: chapter quiz', 'chapter', 70, 3, 99, true),
('a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000103',
 'certified-ai-virtual-assistant-chapter-3', 'Professional judgment: chapter quiz', 'chapter', 70, 4, 99, true)
on conflict (slug) do nothing;

-- Chapter 1 quiz (AI-powered client operations) — 4 questions
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

-- Chapter 2 quiz (Content and communication) — 3 questions
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

-- Chapter 3 quiz (Professional judgment) — 4 questions
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
 'Context, constraints, and format, the four-part briefing, beat both vagueness and flattery.'),

('a0000000-0000-4000-8000-000000000003', 2, 'prompting',
 'AI gave you a decent draft but it''s twice too long and too formal. Your next prompt:',
 '[{"id":"a","text":"\"Make it better\""},
   {"id":"b","text":"\"Cut this to under 100 words and make it conversational, like a message to a helpful workmate\""},
   {"id":"c","text":"Start over in a new chat"},
   {"id":"d","text":"\"Why is this so bad?\""}]',
 'b',
 'Specific, actionable revision instructions. Vague dissatisfaction produces vague changes.'),

('a0000000-0000-4000-8000-000000000003', 3, 'tools',
 'You have a 2-hour recorded lecture to study from. The efficient approach is:',
 '[{"id":"a","text":"Ask a chatbot what the lecture probably covered"},
   {"id":"b","text":"Transcribe it, then have AI summarise the transcript into study notes you check against the parts that matter"},
   {"id":"c","text":"Re-watch it three times taking notes"},
   {"id":"d","text":"Skip it, because recordings can''t be studied efficiently"}]',
 'b',
 'Transcription first, then summarise real text. A chatbot guessing at content it never saw is invention, not studying.'),

('a0000000-0000-4000-8000-000000000003', 4, 'tools',
 'Halfway through pasting a long document, the AI starts ignoring your instructions from the beginning. This means:',
 '[{"id":"a","text":"The tool is broken today, so try again tomorrow"},
   {"id":"b","text":"You''ve exceeded what it can hold at once, so work in sections, repeating the instruction each time"},
   {"id":"c","text":"The document is too advanced for AI"},
   {"id":"d","text":"You need to type the instruction in capital letters"}]',
 'b',
 'Context limits are invisible until you hit them. Chunking with repeated instructions is the standard workaround.'),

('a0000000-0000-4000-8000-000000000003', 5, 'workflow',
 'You post similar job applications several times a week. The AI-era habit is:',
 '[{"id":"a","text":"Write each one fresh, because effort shows"},
   {"id":"b","text":"One strong template with slots for company, role, and your matching experience; AI fills and adapts per posting, you review"},
   {"id":"c","text":"One generic letter sent everywhere unchanged"},
   {"id":"d","text":"Let AI write each one from scratch with no template"}]',
 'b',
 'Build once, reuse with judgment. The template carries your quality; the review keeps each application honest and specific.'),

('a0000000-0000-4000-8000-000000000003', 6, 'judgment',
 'AI tells you a scholarship application closes "March 30" and lists requirements. Before acting, you:',
 '[{"id":"a","text":"Start preparing the listed requirements immediately"},
   {"id":"b","text":"Check the scholarship provider''s official page for dates and requirements, and work from that"},
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
 'The course''s one rule. Tools change; the division of labour, machine speed with human judgment, is the durable skill.')

) as v(assessment_id, sort_order, competency, prompt, options, correct, explanation)
where not exists (
  select 1 from public.questions
  where assessment_id = 'a0000000-0000-4000-8000-000000000003'
);

-- ════════════════════════════════════════════════════════════════════════════
-- CAVA final assignment — reviewed, releases the credential (requires_assignment
-- is true for this certification; see migration 0013).
-- ════════════════════════════════════════════════════════════════════════════

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
on conflict (certification_id) do nothing;

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

-- ════════════════════════════════════════════════════════════════════════════
-- Blog — real posts, not lorem. Editable from /admin without a deploy.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.posts
  (id, slug, title, excerpt, category, author_name, status, published_at, content_mdx)
values
(
  'b0000000-0000-4000-8000-000000000001',
  'what-employers-actually-check',
  'What employers actually check when you say you know AI',
  'A line on your CV costs nothing to write, so it proves nothing. Here is what a hiring manager does next, and what makes that check come back in your favour.',
  'Hiring',
  'GN Academy',
  'published',
  '2026-08-12T02:00:00Z',
  E'"Proficient in AI tools" is now on so many CVs that it has stopped carrying information. It costs one line to write and nothing to back up, so the people reading applications have quietly stopped treating it as a signal.\n\nThat is not cynicism. It is what happens to any claim that is free to make.\n\n## What the check actually looks like\n\nWhen a claim matters, someone tries to confirm it. In practice that is one of four things:\n\n- **A question in the interview.** "Walk me through the last thing you used AI for at work." Vague answers end the topic.\n- **A small task.** Draft this reply, summarise this document, clean up this list. They are watching your process, not your typing speed.\n- **A reference.** Did this person actually do the work described?\n- **A credential.** Something with an issuer and a code they can check themselves.\n\nOnly the last one survives a check the candidate is not present for. That matters, because most rejections happen before anyone speaks to you.\n\n## Why the task trips people up\n\nThe small task is where "I use ChatGPT every day" separates from "I work with AI."\n\nDaily chatting builds familiarity with a text box. Work requires something else: knowing which tasks to hand over, briefing with enough context to get a usable first draft, and (the part that gets missed) checking the output before it reaches someone who is relying on it.\n\nThat last habit is the one hiring managers are most quietly testing for. A confident wrong answer that reaches a client is worse than no answer at all, and everyone who has worked with these tools for a while has a story about it.\n\n## Making the claim checkable\n\nThe fix is not a longer CV line. It is making the claim survive a check you are not in the room for:\n\n1. **Be specific about the work, not the tool.** "Rebuilt a client''s weekly reporting so it takes 40 minutes instead of three hours" beats any tool name.\n2. **Keep one example you can walk through.** The prompt, what came back, what you changed, why.\n3. **Carry proof that stands on its own.** A credential with a public verification page answers the question before it is asked.\n\nNone of this requires you to be an expert. It requires the claim to be the kind of thing someone can confirm, which is a much lower bar than being the best, and a much higher bar than writing a line.\n\n## Where to start\n\nIf you are not sure which of these you can already do, the [AI Readiness Test](/ai-test) scores you across prompting, tool choice, workflow, and judgment in about ten minutes, and tells you which one is weakest. It is free and there is nothing to install.'
),
(
  'b0000000-0000-4000-8000-000000000002',
  'verify-a-credential-before-you-hire',
  'How to verify a GN Academy credential before you hire',
  'Every credential we issue has a code and a public page. Here is how to check one in about ten seconds, and what each part of the result means.',
  'For employers',
  'GN Academy',
  'published',
  '2026-08-14T02:00:00Z',
  E'A certificate image proves nothing: it is a picture, and pictures are editable. That is why every GN Academy credential is a record you can look up rather than a file someone sends you.\n\n## The ten-second check\n\n1. Ask for the credential code. It looks like `CAVA-2026-000001` and belongs on a CV the same way a licence number does.\n2. Go to [gnacademy verification](/verify) and enter it.\n3. Read what comes back.\n\nNo account, no login, no waiting on us to reply to an email.\n\n## Reading the result\n\nThe verification page shows four things that matter:\n\n- **The holder''s name.** It should match the person in front of you.\n- **What they earned**, and at what level.\n- **When it was issued.** Codes are permanent and never reused.\n- **The status.** Active, revoked, or expired.\n\nA revoked credential still resolves. It does not disappear. The page says revoked, along with the reason. That is deliberate: a credential that silently vanishes is easy for its holder to explain away, and a withdrawal that stays visible is the only version that protects you.\n\n## What the competencies mean\n\nPassing is not a single number. Each credential carries a per-competency breakdown: prompting and output quality, tool fluency, workflow integration, and judgment and verification.\n\nThat breakdown is useful when you are choosing between candidates who both passed. Someone strong on workflow is a good fit for recurring operations work. Someone strong on judgment is who you want anywhere output reaches a client unreviewed.\n\n## If a code does not resolve\n\nNothing found means no credential with that code exists. Check for typos first: the format is prefix, year, then six digits. If it still comes back empty, treat the claim as unverified. We would rather you check than assume.'
)
on conflict (slug) do nothing;
