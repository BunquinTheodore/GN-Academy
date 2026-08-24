# PROGRESS

## Phase 1 — Foundation — ✅ COMPLETE AND FULLY VERIFIED (2026-08-18)
Auth-flow e2e passes live; Lighthouse / 94-95 + 100, /ai-test 93 + 100. On main.

## Phase 2 — The funnel — ✅ COMPLETE AND FULLY VERIFIED (2026-08-18)
Funnel + RLS e2e pass live; /ai-test/quiz 92 + 100, results 95 + 100. On main.

## Phase 3 — Certification and credentials (branch: phase-3-certification)

- [x] Migration 0003: certifications, modules, lessons (enrollment-gated RLS),
      enrollments, lesson_progress, credentials (public read), atomic
      credential-code sequences — applied to live DB
- [x] Seed: CAVA (₱1,499) + free AI Foundations with 14 real lessons, two
      knowledge exams (18 new questions), 3 fictional demo credentials;
      seed made idempotent
- [x] /certifications catalogue + [slug] product page (Course JSON-LD, ISR)
- [x] Enrollment: paid → pending with GCash/Maya reference; free → instant
- [x] /admin/enrollments approval queue (audit-logged, claim re-checked in action)
- [x] Course player: MDX lessons, preview gating, progress sync, next-lesson flow
- [x] Exam engine: max 3 attempts, server-scored, competency breakdown
- [x] Credential issuance: atomic {PREFIX}-{YEAR}-{SEQ}, audit_log, email
- [x] /verify + /verify/[code]: public, JSON-LD credential, revoked/not-found states
- [x] On-demand PDF certificates (pdf-lib, generated from the live record)
- [x] Dashboard: courses, assessments, credentials pages
- [x] E2E (36/36 passing live, mobile + desktop) including the phase gate:
      sign up → enroll free → all lessons → pass exam → credential issued →
      logged-out stranger verifies the code publicly; plus paid
      pending→approved→active
- [x] A11y: catalogue/product/verify all 100
- [x] Lighthouse perf gate: /verify/[code] 93-94 ✓. Catalogue and product
      re-measured 2026-08-19 against a paired homepage control in the same
      window: control 83-86 (94-95 on a quiet machine), catalogue 81-82,
      product 83-91, a11y 100 everywhere. The pages track the control within
      noise — the earlier 81-88 reading was CPU contention, not a regression.
      Also banked a real fix: generateStaticParams prerenders both product
      pages (warm TTFB 578ms → 13ms). Absolute numbers are worth one more
      read on a quiet machine, but the parity question is settled.
- [x] Merge phase-3-certification → main

Last verified: 2026-08-19 — verify green (16 unit tests), build green, e2e 36/36 live as of 2026-08-18.

Known gaps:
- Real GCash/Maya receiving numbers not yet in enrollment copy (BLOCKED.md).
- Enrollment-approved email not sent yet (only credential-issued is); add with
  Phase 4 email pass.
- GitHub Actions secrets still unset; gh CLI installed, awaiting `gh auth login`.
- Video lessons: schema supports video_url; no videos exist yet (content decision).

## Phase 4 — Admin and content (branch: phase-4-admin-content) — COMPLETE

Gate: *a non-developer publishes a new certification and a blog post with no
deploy.* Met — both are database-backed and edited from /admin.

- [x] Migration 0004: posts, data_requests, updated_at triggers — applied live
- [x] /admin CRUD: certifications, modules, lessons (nested <details> editors,
      one form per entity), questions with a competency-coverage panel
- [x] Credential revocation with a mandatory public reason + reinstate
- [x] Leads table + CSV export (admin claim re-checked in the route,
      audit-logged, formula-injection safe, UTF-8 BOM)
- [x] Enrollment-approved email
- [x] DB-backed MDX blog with categories, Article JSON-LD, two real seed posts
- [x] sitemap.ts, robots.ts, Organization JSON-LD, OG cards for certs + posts
- [x] Analytics: cookieless provider via two env vars; 11 of 12 §13 events
      wired. enrollment_confirmed and free_lesson_completed are counted from
      the database instead — see DECISIONS
- [x] /data-request form → admin queue → real account deletion (credentials
      retained but unlinked, audit_log retained, per §14 and /privacy)
- [x] Funnel metrics on /admin, last 30 days and all time, against §13 targets
- [x] E2E: 54/54 live (mobile + desktop), now against a production build
- [x] verify green: typecheck, lint, 21 unit tests, build

Real bugs found by moving e2e to a production build:
- Lesson progression needed a second click in production — chained action
  redirects are dropped by the App Router. Fixed by returning the href.
- The whole suite had been running against an unrelated project's server on
  port 3000.
- Data requests shared the email-capture rate-limit bucket.

Known gaps carried forward:
- Real GCash/Maya receiving numbers not yet in enrollment copy (BLOCKED.md).
- GitHub Actions secrets still unset; gh CLI installed, awaiting `gh auth login`.
- Analytics is inert until NEXT_PUBLIC_ANALYTICS_* are set (BLOCKED.md).
- Video lessons: schema supports video_url; no videos exist yet.

## Phase 5 — Talent layer — COMPLETE

- [x] Migration 0005: portfolio_items, employer_enquiries, username format +
      case-insensitive uniqueness, storage policies — applied to the live DB
- [x] Storage buckets `avatars` and `portfolio` created against the live project
- [x] /dashboard/profile: full editor + portfolio items, WebP upload
- [x] /talent/[username]: public profile, Person JSON-LD, credential links
- [x] /employers: directory with skill + certification filters
- [x] /employers/enquire + /admin/enquiries queue
- [x] /companies page; footer + sitemap wiring
- [x] E2E tests/e2e/talent-flow.spec.ts green

The talent e2e was red for a real reason, not for load. See Phase 6.

## Phase 6 — Hardening and launch readiness — COMPLETE

Six commits on `phase-5-talent`, merged to `main` as `6c92da7` and pushed.
`npm run verify` is green and the full live e2e suite is **64/64 with no
flakes, in 2.2 minutes** (it was 5.1 minutes before the last fix). See
README §21 and §22.

### The bug the talent suite was actually reporting

A server action that calls `revalidatePath` and returns state to
`useActionState` never finishes its transition in a production build. Measured
end to end: the action and the page re-render both complete on the server in
under a second, and the browser sits on a disabled "Saving…" button until the
test's 90-second budget runs out. It reproduces with a single call against an
unrelated fully dynamic route, disappears the moment the call is removed, and
`next dev` hides it completely.

Every admin editor called `revalidatePath`. **The whole admin area was broken
in production and the suite never noticed**, because no test had ever
submitted an admin form — they only read admin pages. Fixed:

- [x] `revalidatePath` removed from every state-returning action. Calls that
      targeted fully dynamic routes were no-ops and were deleted; the ones
      that mattered (`/certifications`, `/certifications/[slug]`,
      `/blog/[slug]`, `/ai-test/quiz`, `/sitemap.xml`) are now purged by
      `POST /api/revalidate`, fired by `AdminForm` after a successful save
- [x] Admin create/delete actions return `redirectTo` instead of calling
      `redirect()` — the same pattern the lesson player already uses
- [x] New e2e: an admin writes, publishes, and edits a post through the real
      UI, and a logged-out stranger reads it immediately
- [x] Profile saves measured 5/5 at 0.9–2.0s afterwards (was 2-of-3 hanging)
- [x] Same failure from the client side: `router.refresh()` immediately after
      `router.push()` in `CompleteLessonButton` stopped the lesson transition
      from ever completing. Bisected on one build with a runtime toggle — the
      journey passes in 36.4s without it and fails with it. Removed. **This
      one has not been through a full suite yet.**

### Correctness fixes found by an audit of the whole codebase

- [x] A rejected paid enrollment could never be re-submitted — the retry path
      existed but always hit the unique constraint, so a mistyped payment
      reference locked a paying customer out permanently. `createEnrollment`
      upserts now
- [x] Ticking "list me in the directory" without a credential threw the whole
      profile edit away while saying it had been saved. It now saves
      everything and holds back only the tick
- [x] A rejected enrollment rendered on the dashboard as an active course with
      a progress bar and a dead "Start learning" button
- [x] The exam result screen claimed "your credential is live" on any pass,
      including passes where no credential was issued
- [x] Two concurrent submissions of one exam attempt could both issue a
      credential. `completeAttempt` is now the claim on the attempt: the
      loser gets a 409
- [x] `POST /api/attempts` accepted any published assessment slug, including
      paid certification exams, skipping the enrollment and attempt-limit
      checks. Diagnostic only now
- [x] Account erasure left the avatar and portfolio images public at stable
      URLs. Storage folders are deleted first
- [x] Migration 0006 drops the two RLS policies that let a signed-in browser
      write directly (`profiles` update, `attempts` insert) — the app has
      never used them and they bypassed every server-side validation
- [x] `getSessionUser` wrapped in React `cache()`: one revocation round trip
      to Google per request instead of three
- [x] Dead-end messages ("email us", "our payment instructions page") now name
      a real address

### Configuration that no longer needs a developer

- [x] GCash/Maya receiving details are `NEXT_PUBLIC_PAYMENT_*` env vars
- [x] Email sender is `RESEND_FROM`
- [x] README rewritten as the complete reference for the codebase

### Still open — none of it is code

See `BLOCKED.md` and README §18: analytics account, Resend domain, payment
account details, legal review, brand wording, hosting, and the first cohort.

## Phase 7 — Deployed — COMPLETE

- [x] Live at https://gn-academy-phi.vercel.app (Vercel Hobby, at the client's
      instruction; their terms bar commercial use, which is a live risk once
      money changes hands)
- [x] NEXT_PUBLIC_SITE_URL corrected from localhost, so the sitemap, OG cards
      and credential email links point at the real origin
- [x] Firebase authorized domains added via the Identity Toolkit admin API,
      without which every sign-in on the live domain fails
- [x] jose pinned to v5: firebase-admin depends on jwks-rsa, which `require()`s
      an ESM-only jose 6. Next keeps firebase-admin external, so every
      authenticated route 500'd in production while passing locally
- [x] Repo secrets set; keep-alive and backup workflows dispatched and verified
- [x] The weekly backup had never once produced a backup. Wrong pg_dump major
      version, and `pg_dump | gzip` exited with gzip's status so it reported
      success while archiving 170 bytes of nothing. Now produces ~80 KB
- [x] Production smoke test: 9/9, including sign-up on the live domain and the
      GCash QR rendering on the enroll page

## Phase 8 — Curriculum and UI — COMPLETE

- [x] Migration 0007: chapter quizzes, assignments, assignment_submissions,
      certifications.requires_assignment
- [x] Migration 0008: modules.slug, so renaming a chapter stops forking the
      module and resetting learners' progress
- [x] maybeIssueCredential(): the single place a credential is released, with
      every prerequisite re-read from the database
- [x] Learner flow: chapter quiz after each chapter (unlimited retakes), then
      an assignment gated on all lessons read and all quizzes passed
- [x] Admin review queue; approving issues the credential and emails it,
      returning work requires a written note
- [x] Four new courses, text only: AI Essentials for Work, AI-Powered Digital
      Marketing, AI Social Media Management, Prompt Engineering with Claude.
      About 37,000 words, 128 questions, four assignments
- [x] Public site is now a sales page; catalogue behind the login, out of the
      sitemap and disallowed in robots
- [x] Motion on the landing page (motion v13), reduced-motion respected
- [x] Signed-in shell: persistent sidebar with live state, per-course status
      cards carrying one next action each
- [x] Light / dark / system theme toggle
- [x] Every em dash removed from user-facing text: 250 in the app and seed,
      every course file rewritten, live database refreshed, guarded by a test
- [x] Fixed by /code-review before shipping: scoreAttempt weighted absent
      competencies as zero, which made one course's credential mathematically
      unobtainable, plus nine other defects

## Phase 9 . Review pass before shipping (22 August 2026)

Committed as `aa4f721`. A code review over the 94-file diff found nine issues;
six were fixed here and two are written up in `HANDOFF.md` §4b as deliberate
deferrals.

- [x] The AI test results page sent anonymous finishers into two routes that
      now redirect to login. They go through `/signup?next=` instead
- [x] An approved assignment with no active credential told the learner to
      start the assignment again
- [x] `seed-courses.ts` rewrites questions in place by `sort_order`; deleting
      and re-inserting scored in-flight attempts as zero
- [x] `attempt-create` rate limit 5/hour to 20/hour per hashed IP, because
      mobile carrier NAT puts many of this audience behind one address
- [x] Exam and quiz radiogroups labelled by their own question. Unnamed, they
      also collided with the theme toggle's radiogroup and made the exam e2e
      assert against the wrong element
- [x] Theme toggle reachable on phones, in both the public header and the
      dashboard mobile bar
- [x] Dashboard reads deduplicated with React `cache()`; independent
      assignment reads parallelised
- [x] Em dash guard extended to `scripts/`, which had been writing one into
      `assessments.title`; 18 live rows cleaned, and the database re-checked
      across every table rather than four
- [ ] `SiteHeader` reads the session, so every public page is dynamic and three
      `revalidate` exports are dead. Written up, not fixed
- [ ] The dashboard's per-course loop is still serialised

Suite at the end: `npm run verify` green, 68 e2e tests passing. The
certification journey remains occasionally flaky on the lesson-to-lesson
navigation under full concurrency; it passes on retry and the cause is the one
documented in `src/app/api/lessons/[lessonId]/complete/route.ts`.

## Phase 10 . Free basics, certificate type, and the brand move (25 August 2026)

Client comments this session: drop "Part of GN Ventures" from the top of the
page and credit it in the footer instead; the certificate design is good but its
type is small and reads as a serif; "hire verified talent" is right as it is.
Then: put free AI, blockchain and finance knowledge on the site.

- [x] **Brand.** Hero kicker removed and the motion stagger re-timed so the page
      does not open on an empty beat. Footer legal line now reads "Powered by GN
      Ventures". About page heading is "The network behind the credential" and
      keeps the argument that the community is a hiring network. `BLOCKED.md` 5
      and README 18 item 6 are resolved.
- [x] **Certificate typography.** The page is drawn by
      `src/lib/pdf/certificate.ts`, a pure function with no database, so it has
      a unit test. Bricolage Grotesque and Inter are embedded through
      `@pdf-lib/fontkit` as **static instances**: the Google Fonts copies are
      variable fonts and pdf-lib silently embeds the 400 weight from one, so a
      bold heading would not have been bold. Name 32 to 42pt, title 24 to 28,
      code 18 to 22, with `fitFontSize` stepping a long name down until it fits
      the gold rule. A 60-character name lands at 24pt and stays inside the
      margins. `subset: true` keeps the PDF near 22 kB.
- [x] **The "Times New Roman" complaint had a real cause.** `StandardFonts`
      embeds a *reference* to a base-14 font, not the font. A viewer without
      Helvetica substitutes, and it often substitutes a serif. Embedding is the
      only fix; enlarging alone would not have worked.
- [x] **Competency registry.** `src/content/competencies.ts` holds twelve keys
      across three domains. The AI four keep their labels and weights exactly,
      so nothing already issued moved. `scoreAttempt` now returns only the
      competencies an assessment actually asked about, without which an AI
      credential would have printed "Wallets and custody: 0".
- [x] **Two course shapes.** `seed-courses.ts` reads `requires_assignment` and
      an optional `final_exam`, and refuses a file that claims one shape and
      carries the other. Chapter quizzes and final exams share one question-sync
      path, because a divergence there is what scores a live attempt as zero.
- [x] **The final exam is gated on the chapter quizzes** in
      `/api/exams/[slug]/attempts`, a no-op for the two courses that have none.
      Both dashboards show quiz state for exam courses, and the dead
      `?cert=` link on the courses page now points at the exam itself.
- [x] **Three free courses**, 3 chapters of 3 lessons, 24 quiz questions and a
      15-question exam each: Basic AI (BAI), Basic Blockchain (BBC), Basic
      Finance (BFN). About 23,300 words. They sort first on negative
      `sort_order`, which README 21 explains.
- [x] **A validator instead of an eye.** `scripts/validate-courses.ts` and
      `tests/unit/course-content.test.ts` over
      `src/lib/courses/content-checks.ts` measure the authoring rules: schema,
      competency keys in range, one domain per assessment, answer-key spread,
      correct-is-longest, correct-is-shortest, option-length spread, word
      counts, and a scan for invented statistics.

### What the review passes caught

- **The opposite tell.** Guarding only "the correct answer is longest" pushed a
  Basic AI draft to **48.7% correct-is-shortest** while it measured 2.6% on the
  longest direction, and the shortest option alone cleared the pass mark on one
  chapter quiz. The check now measures both directions. Shipped: Basic AI 5.1%,
  Basic Blockchain 15.4%, Basic Finance 20.5%.
- **Basic AI as first outlined duplicated seven of its nine lessons** from AI
  Foundations, AI Essentials for Work and the Claude course, chapter 2 being a
  clone of AI Essentials chapter 2 in the same order. The editorial pass caught
  it before a word was written and repositioned the course around comprehension
  and consumer safety, which nothing else in the catalogue teaches.
- Measured on what shipped: 245 questions across seven course files,
  correct-is-longest 10.2%, answer key 62/62/62/59 across a, b, c and d.

### What /code-review found, and what was done about it

Five findings on the working tree, all fixed before commit.

- **The content gate reported PASS on a broken course.** One malformed question
  was filtered out before any rule saw it, `structurallySound` then refused to
  measure the file, and the script printed no failures and exited 0. An author
  could write `"correct_option_id": null`, run the gate the README sends them
  to, watch it go green, and seed a quiz that scores zero for everyone who sits
  it. `checkQuestionShapes` now reports each one by chapter and question number.
  Confirmed by breaking a real course file: exit 1 broken, exit 0 restored.
- **A long name drew off the edge of the certificate.** `fitFontSize` returned
  the 16pt floor whether or not the text fitted there, and `profiles.full_name`
  accepts 120 characters, which measures about 1340pt on an 842pt page. The x
  offset went negative and the name ran past both edges of the paper, not just
  past the gold rule. `fitText` now cuts to an ellipsis below the floor. The
  original test only tried 60 and 70 characters, both of which fit.
- **Legacy competency rows would contaminate a credential.** Attempts completed
  before `scoreAttempt` started filtering stored a zero row for every registry
  key. A learner who passed some chapters before this deploy and the rest after
  would get a breakdown averaging those zeros in, printing a competency they
  were never tested on as 0, which reads as a failure rather than a silence.
  `competenciesFromAttempts` now skips rows with `total === 0`. No backfill
  needed.
- `seedCourseSlugs` handled `indexOf` returning -1 by slicing to the end of the
  file, which pulled in blog post slugs and would have blocked a legitimate
  course for colliding with a "slug" that was really a blog post. It throws now,
  like its sibling `seedCredentialPrefixes` already did.
- The admin coverage panel still told admins that an unasked competency "scores
  0 for everyone, which drags every result down". That was true before this
  session and is now the opposite of what the engine does. An admin acting on it
  would pad a quiz with off-topic questions, which the single-domain rule then
  hard-fails.

### Deliberately not fixed, and written up

- **No shuffling anywhere in the assessment engine.** Questions and options come
  back in `sort_order` every time, so a repeat taker meets an identical paper.
  Exposure is limited because a finished attempt returns only the score, the
  pass flag and the competency breakdown: no per-question result, no correct
  answer, no explanation. Shuffling option order is safe whenever someone wants
  it, since `correct_option_id` is an option id rather than a position.
- **AI Essentials for Work 4.1 and 4.2 overlap Basic AI.** The verbatim
  collisions were rewritten out of the free course; the structural overlap is
  on the paid side and the fix is to move AIE upward. See `HANDOFF.md`.
- Two paid courses warn on correct-is-shortest: AI Essentials 28.1% and Prompt
  Engineering 37.5%. Both predate this work.
