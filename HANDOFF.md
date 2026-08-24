# GN Academy: Session Handoff

**Written:** 25 August 2026 (previous session: 22 August)

`README.md` is the complete reference for this codebase: stack, setup, env
vars, auth model, database schema, route map, security, testing, launch
checklist, and the "don't fix this" list. Read it first. This file is only what
someone picking the work up needs that the README does not say.

Also: `PROGRESS.md` (phase-by-phase resume point), `DECISIONS.md` (every
judgement call), `BLOCKED.md` (things only a human can do).

---

## 1. Where things stand

**The site is live:** https://gn-academy-phi.vercel.app

Everything is on `main`, pushed, and deployed. **The GitHub repo is connected
to Vercel, so a push to `main` builds and promotes to production by itself.**
Nothing has to be deployed by hand; check `npx vercel ls` after a push rather
than assuming either way.

`npm run verify` is green: 93 unit tests, typecheck, lint and build.
`npx tsx scripts/validate-courses.ts` passes over 245 questions in 7 files.

**The e2e suite has not been run this session.** It was 68 passing at the end of
phase 9, with one known flake: the certification journey occasionally times out
moving between lessons under full concurrency and passes on retry, and the cause
is written up in `src/app/api/lessons/[lessonId]/complete/route.ts`. Phase 10
changed the exam gate, both dashboard cards, the exam intro copy and the
certificate route, so treat the suite as unproven until it is run rather than
assuming it still passes. Treat a red run there as unproven, not as broken.

Migrations 0001 to 0008 are applied to production. **No migration was needed
this session.** The catalogue is nine published courses: five that end in an
auto-scored exam, four that end in a reviewed assignment.

**The three new courses are not in the live database yet.** They exist as files
in `supabase/courses/` and nothing has been seeded. Run
`npx tsx scripts/seed-courses.ts` to publish them.

The product loop works end to end: a stranger reads the landing page, creates
an account, sees the catalogue, enrols, reads a course, passes a quiz per
chapter, submits a final assignment, a human reviews it, and the credential
issues with a public verification page.

---

## 2. What this session added (25 August)

### Three free courses, and the shape that lets them exist

Basic AI, Basic Blockchain and Basic Finance: 3 chapters of 3 lessons, 24 quiz
questions and a 15-question final exam each, about 23,300 words. They are free
and they end in an **auto-scored exam**, so passing issues the credential with
nobody in the loop, which is the only shape that works for free courses at
volume. `seed-courses.ts` grew a `final_exam` block and an optional
`assignment` to support it, `/api/exams/[slug]/attempts` gates the exam on the
chapter quizzes, and a twelve-key competency registry means a finance credential
no longer has to print "Prompting and output quality".

Read PROGRESS.md phase 10 for the full list, including what the review passes
caught and what was deliberately left.

### The certificate reads as a serif because it was never embedding a font

`StandardFonts.Helvetica` embeds a *reference* to a base-14 font. A viewer with
no Helvetica substitutes, often with a serif, which is exactly what the client
saw. Enlarging the text alone would not have fixed it. Bricolage Grotesque and
Inter are now embedded as static instances through `@pdf-lib/fontkit`. Static,
not the Google Fonts copies: those are variable fonts, and pdf-lib embeds the
default 400 weight from one without complaining, so a bold heading quietly
would not have been bold.

### What this session added (22 August)

### Chapter quizzes and reviewed assignments

Courses can now end in a human decision rather than a score. Migration 0007
added `assessments.module_id` (a quiz per chapter), the `assignments` and
`assignment_submissions` tables, and `certifications.requires_assignment`.
Migration 0008 added `modules.slug`.

Credential issuance moved into one function, `maybeIssueCredential()`. Both
paths to a certificate go through it, and it re-reads every prerequisite from
the database rather than trusting its caller. Full description in README 21.

### Four new courses

AI Essentials for Work, AI-Powered Digital Marketing, AI Social Media
Management, and Prompt Engineering with Claude. Four chapters of three lessons
each, an eight-question quiz per chapter, one final assignment. Text only.
About 37,000 words and 128 questions in total. Authored in
`supabase/courses/*.json`, loaded with `scripts/seed-courses.ts`.

### The public site became a sales page

`/certifications`, `/certifications/[slug]` and `/start-free` now require a
session. The landing page describes the offer and links only to sign-up and
sign-in. See README 22, including the SEO cost of that trade.

### A signed-in shell, motion, and theming

Persistent sidebar with live state, per-course status cards, `motion` v13 on
the landing page with reduced-motion support, and a light/dark/system toggle.
README 23.

### No em dashes in user-facing text

250 removed from the app and the seed, every course file rewritten, and the
live database cleaned. `tests/unit/no-em-dashes.test.ts` keeps them out, and it
scans `scripts/` as well as `src/`.

Worth knowing, because it was nearly missed: the first database sweep checked
`questions`, `lessons`, `posts` and `certifications`, reported clean, and left
eighteen em dashes in `assessments.title`, which learners read on their courses
page. `scripts/seed-courses.ts` had been writing them there. Verify a claim
like this by walking `information_schema` and testing `to_jsonb(t)::text` on
every table, not the tables that obviously hold prose. README 24.

---

## 3. Things that cost time, so you do not repeat them

**An adversarial review of generated course content is not optional.** The
first draft of every course looked excellent and was not shippable: invented
statistics ("half of all AI mistakes", "70% of the work"), wrong platform
facts, an overstated reading of RA 10173, and quizzes where the correct answer
was reliably the longest option. The last one matters most: a test-wise learner
could score well having read nothing, which hollows out the credential the
product rests on. Three passes were needed. Measured on what shipped:
correct-is-longest in 12% of 128 questions against 25% for guessing, and an
answer key of exactly 32 on each of a, b, c and d.

**`/code-review` caught a bug that would have shipped a dead product.**
`scoreAttempt` averaged across the four fixed competencies and weighted absent
ones as zero, so a chapter of eight judgment questions scored 20% for a perfect
paper against a 70% pass mark. One course's credential was mathematically
unobtainable. Nothing in ordinary testing would have surfaced it.

**Seeding does not update.** `seed.sql` inserts with `on conflict do nothing`
and guards its question blocks with `where not exists`; `seed-courses.ts`
inserts questions only when a quiz has none. That is correct, since it protects
`/admin` edits, but it means changing authored copy does nothing to a live
database. `scripts/refresh-seed-content.ts` and
`seed-courses.ts --replace-questions` exist for exactly that, and both are
opt-in because both discard admin edits.

**A shared UI control can silently capture a test's locators.** Adding the
light/dark/system toggle put a second `radiogroup` on every signed-in page. The
exam e2e called `page.getByRole("radio")` unscoped, so `radios.first()` matched
the theme control, which is visible immediately, and the visibility wait passed
before any question had rendered. The test then found no answer and failed
somewhere else entirely. Scope locators to the thing under test, and give an
interactive group an accessible name so it can be told apart.

**Running the e2e suite repeatedly exhausts the rate limiter.** `attempt-create`
is capped per hashed IP per hour, and the funnel tests start a real attempt on
both viewport projects. Three runs inside an hour and the later ones fail with
what looks like a broken quiz page. Before believing a funnel failure, check
`public.rate_limits`; the bucket for a local run is
`sha256("$IP_HASH_SALT:unknown"|"::1")` plus `:attempt-create`, and deleting
just that row is safe because a request from Vercel always carries
`x-forwarded-for`.

**Never pipe a long script through `head`.** Doing that to
`seed-courses.ts --replace-questions` sent SIGPIPE and killed it halfway, which
looked like a partial failure of the script rather than of the pipe.

---

## 4. Next actions

1. **Rotate the admin password.** It is still `12345678` on an account that
   reads every lead's phone number, can delete users, and now approves
   assignments. `/admin` is on the public internet.
2. **Verify the Resend domain.** Email still only reaches the account owner, so
   a learner whose assignment you approve gets a credential and no email. That
   is the largest functional gap left.
3. **Rotate the three secrets pasted in chat** (Supabase service key, database
   password, Resend key) if that transcript is stored anywhere shared.
4. **Decide `npm audit`.** Nine findings, all in build tooling. The
   non-breaking route is npm `overrides` pinning `postcss`, `sharp` and `uuid`.
   Verify and re-run `auth-flow.spec.ts` afterwards.
5. **Lighthouse on a quiet machine.** Never re-measured since the rebrand, the
   motion work, or the new shell. Use the paired-control method in
   `DECISIONS.md`.
6. **Nothing to do about deploys.** The repo is already connected: pushing to
   `main` deploys. This entry used to say the opposite, which was true earlier
   in the project and is not now.

---

## 4b. Known issues a code review found and this session did not fix

Both are real, both were measured, and neither is a correctness bug. They are
here so the next session does not have to rediscover them.

### Public marketing pages no longer prerender

`SiteHeader` became `async` and reads the session cookie so it can show "My
dashboard" instead of "Sign in". That makes every page containing it dynamic.
Confirmed in the build output: `/`, `/about`, `/privacy`, `/terms`,
`/how-it-works`, `/companies`, `/blog`, `/employers`, `/verify` and
`/talent/[username]` all report `ƒ (Dynamic)`, and only nine routes remain in
`.next/prerender-manifest.json`.

Two consequences: the `export const revalidate = 300` still sitting in
`blog/page.tsx`, `blog/[slug]/page.tsx` and `employers/page.tsx` does nothing,
and a signed-in visitor now waits on a Firebase `verifySessionCookie` round
trip to Google before the header paints on a page that used to be a static
file.

The fix is to stop reading the session on the server here: keep `SiteHeader`
synchronous and move the two auth-dependent buttons into a small client
component that reads Firebase auth state. The cost is a brief "Sign in" flash
for signed-in users on public pages. That trade was not made unilaterally on
the last day of a session, because it changes what every visitor sees first.

### The dashboard still serialises per-course reads

`src/app/dashboard/page.tsx` loops over enrollments and awaits inside the loop.
The three assignment reads are now a `Promise.all`, and the three DAL functions
the layout and the page both call (`getProfileById`,
`listEnrollmentsForUser`, `listCredentialsForUser`) are wrapped in React
`cache()` so they run once per request instead of twice. What remains is the
loop itself: a learner in five courses still pays roughly five sequential
`getModulesWithLessonMeta` + `getCompletedLessonIds` pairs, on a page that is
`force-dynamic`. Collapsing it means restructuring a 120-line loop with several
`continue` branches into a function that returns a card, which is a real
refactor rather than a tidy-up.

---

### AI Essentials for Work 4.1 and 4.2 now repeat Basic AI

An adversarial review of `basic-ai.json` found that chapter 3's two closing
lessons and AI Essentials for Work chapter 4's first two lessons teach the same
material, in places sentence for sentence. Basic AI's copies were rewritten in
this pass (the screenshots paragraph is now the household case, the "would you
email this to a stranger" framing is now the queue, the government-identifier
list was reordered, and lesson 3.3's third real source was renamed), so the
verbatim collisions are gone.

The structural problem is not. A learner who finishes the free course and then
pays ₱1,499 for AI Essentials still meets two lessons whose content they have
already read, only phrased differently. The free course is the one a beginner
needs, so the fix belongs on the paid side: AIE 4.1 should move up from "here
are three real sources" to checking work somebody else will be paid for
(recomputing figures, quotes and citations, what to do when you cannot verify),
and AIE 4.2 should move up from a never-paste list to client data, NDAs,
acceptable-use policies and the conversation you have with an employer before
you paste anything. Both already gesture at that material; neither leads with
it.

### The correct-is-shortest check is a warning on three other course files

`src/lib/courses/content-checks.ts` now measures `correctIsShortest` alongside
`correctIsLongest`, because a Basic AI draft reached 48.7% on the shortest
direction while measuring 2.6% on the longest one, and the shortest option alone
cleared the pass line on one of its chapter quizzes. It hard-fails at 40% and
warns above 25%.

It warns, today, on two of the four paid courses that predate this work:
`ai-essentials-for-work` at 28.1% and `prompt-engineering-with-claude` at 37.5%.
All three new courses finished under the line (Basic AI 5.1%, Basic Blockchain
15.4%, Basic Finance 20.5%). The two that warn need the same rebalancing Basic
AI had: lengthen the keyed option or trim the distractors, never move the key.
Once they are under 25%, `MAX_CORRECT_IS_SHORTEST` should come down to meet
`MAX_CORRECT_IS_LONGEST` at 0.25 so both directions fail at the same line.

### A credential-issuing exam serves the same questions in the same order

`src/lib/assessment` has no shuffle anywhere: questions and options come back in
`sort_order` and are rendered in that order. A chapter quiz allows 99 retakes
and a final exam allows 3, so a repeat taker on attempt two is working against a
fixed question order, a fixed option order and a fixed answer key. Basic AI's
exam key was reordered in this pass because questions 1 to 4 and 9 to 12 carried
the identical permutation, but that is a patch on the content, not a fix. The
engine should shuffle option order per attempt, and the answer key should be
stored against option ids rather than positions so that shuffling stays safe.

### The three free basics sort first, on negative sort_order

`basic-ai`, `basic-blockchain` and `basic-finance` are `sort_order` -3, -2 and
-1. Everything already in the catalogue keeps the number it has: AI Foundations
0, CAVA 1, and the four paid course files 2 to 5. The catalogue orders on
`sort_order` alone, so the free basics lead, AI Foundations follows as the next
rung, and the paid tracks come after it.

An earlier pass in this session renumbered the whole catalogue instead, moving
AI Foundations to 1 and CAVA to 2 in `supabase/seed.sql`. That was reverted, and
the reason is worth keeping: `seed.sql` inserts certifications `on conflict
(slug) do nothing`, so those two rows would never have changed in production.
The file would have claimed one order and the live catalogue would have shown
another, with nothing failing to reveal it. Negative numbers are slightly odd to
read; a file that silently disagrees with the database is worse.

## 5. Session-start ritual

1. Read `README.md`, then this file, then `PROGRESS.md`, then `BLOCKED.md`.
2. State the next three tasks.
3. `npm run verify` before adding anything.
4. Work; commit per feature; push each; update the state files as you go.

And the rule this project keeps re-earning: **measure before you fix.** A red
e2e run has been the environment three times and a real production bug three
times, and the two are indistinguishable from the failure message alone.
