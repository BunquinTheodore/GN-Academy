# GN Academy: Session Handoff

**Written:** 22 August 2026

`README.md` is the complete reference for this codebase: stack, setup, env
vars, auth model, database schema, route map, security, testing, launch
checklist, and the "don't fix this" list. Read it first. This file is only what
someone picking the work up needs that the README does not say.

Also: `PROGRESS.md` (phase-by-phase resume point), `DECISIONS.md` (every
judgement call), `BLOCKED.md` (things only a human can do).

---

## 1. Where things stand

**The site is live:** https://gn-academy-phi.vercel.app

Everything is merged to `main` and deployed. `npm run verify` is green and the
full live e2e suite passes. Migrations 0001 to 0008 are applied to production.

The product loop works end to end: a stranger reads the landing page, creates
an account, sees the catalogue, enrols, reads a course, passes a quiz per
chapter, submits a final assignment, a human reviews it, and the credential
issues with a public verification page.

---

## 2. What this session added

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
live database refreshed. `tests/unit/no-em-dashes.test.ts` keeps them out.
README 24.

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
6. **Connect the Git repo to Vercel** if you want pushes to deploy
   automatically. Deploys currently run from a local machine.

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

## 5. Session-start ritual

1. Read `README.md`, then this file, then `PROGRESS.md`, then `BLOCKED.md`.
2. State the next three tasks.
3. `npm run verify` before adding anything.
4. Work; commit per feature; push each; update the state files as you go.

And the rule this project keeps re-earning: **measure before you fix.** A red
e2e run has been the environment three times and a real production bug three
times, and the two are indistinguishable from the failure message alone.
