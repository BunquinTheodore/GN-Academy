# GN Academy

**Learn. Prove. Get hired.**

A certification and talent platform for Filipinos entering the AI-powered
workforce. The product is one loop:

```
free AI Readiness Test → email capture → free course → paid certification
   → publicly verifiable credential → talent profile → employer enquiry
```

Every step of that loop is built and working. This file is the complete
reference for the codebase — what exists, where it lives, and why it is the
way it is. Companion files: `PROGRESS.md` (resume point), `DECISIONS.md`
(every judgement call, one line each), `BLOCKED.md` (things only a human can
do), `HANDOFF.md` (session-to-session narrative).

---

## 1. Status

All six phases are on `main` as of 21 August 2026.

| Phase | Scope | State |
|---|---|---|
| 1 — Foundation | Auth, profiles, RLS, layout, legal drafts | ✅ merged to `main` |
| 2 — Funnel | AI Readiness Test, email capture, results | ✅ merged to `main` |
| 3 — Certification | Courses, exams, credentials, public verification | ✅ merged to `main` |
| 4 — Admin & content | Admin CRUD, blog, SEO, analytics, privacy tooling | ✅ merged to `main` |
| 5 — Talent layer | Public profiles, portfolio, employer directory | ✅ merged to `main` |
| 6 — Hardening | Production bug fixes, audit fixes, configuration | ✅ merged to `main` |
| 7 — Deploy | Live on Vercel, Firebase domains, workflows verified | ✅ merged to `main` |
| 8 — Curriculum & UI | Chapter quizzes, reviewed assignments, four courses, gated catalogue, dashboard shell, theming | ✅ this session |

`main` is the complete product. Nothing the platform needs in order to
*function* is missing; what remains before taking money is credentials,
content, and business decisions (§18 and `BLOCKED.md`).

**Health of the working tree right now**

| Check | Result |
|---|---|
| `npm run typecheck` | green |
| `npm run lint` | green |
| `npm run test` (21 unit tests) | green |
| `npm run build` | green |
| `npm run test:e2e` with `E2E_AUTH=1` | **64 of 64**, no flakes, 2.2 min |

Everything is green and committed. Migrations 0001–0006 are applied to the
live database and recorded in `schema_migrations`.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15.5 (App Router, TypeScript strict) | built with **webpack** (`next build`, no `--turbopack`) |
| UI | Tailwind v4 + shadcn/ui (radix base, nova preset) | Geist + Geist Mono + Bricolage Grotesque |
| Identity | Firebase Auth (client) + `firebase-admin` (server) | email/password + Google |
| Data | Supabase Postgres + Storage, RLS on every table | Supabase Auth is **not** used |
| Validation | Zod (+ `react-hook-form` on auth forms) | |
| Email | Resend + `@react-email/components` | degrades gracefully when it fails |
| PDF | `pdf-lib` | certificates generated on demand |
| MDX | `next-mdx-remote` | lesson and blog bodies live in the database |
| Tests | Vitest (unit) + Playwright (e2e) | e2e runs against a production build |

No ORM. Every query is written by hand in the data-access layer (§7).

---

## 3. Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every value marked
   required in §4. `SUPABASE_DB_URL` is needed for step 4.
3. In Supabase: **Authentication → Sign In / Providers → Third-Party Auth →
   add Firebase**, with your Firebase project ID. Without this, every
   authenticated query fails with a JWT error.
4. Apply migrations and seed:
   ```
   npx tsx scripts/apply-migrations.ts --seed
   ```
   Idempotent — safe to re-run. Tracks applied files in `schema_migrations`.
5. Create the two storage buckets if this is a fresh project. They are
   public-read, size- and MIME-limited, and their write policies come from
   migration 0005. On the current project they already exist.
6. `npm run dev`
7. Sign up once in the app, then `npm run make-admin -- you@example.com`,
   then sign out and back in.

---

## 4. Environment variables

The **required** ones are validated at boot and the app refuses to start
without them: `src/lib/env.ts` checks the public ones (and throws a readable
error listing what is missing), `src/lib/env.server.ts` checks the server-only
ones and is `server-only`-guarded. The optional ones below are read straight
from `process.env` by the module that uses them, precisely so that their
absence degrades a feature instead of stopping the build.

| Variable | Where from | Required |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase → Project settings → Web app | yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same | yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same | yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same | yes |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase → Service accounts | yes |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | same | yes |
| `FIREBASE_ADMIN_PRIVATE_KEY` | same — one line, literal `\n`, in double quotes | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | same — an `sb_secret_…` key (§19.2) | yes |
| `RESEND_API_KEY` | Resend → API keys | yes |
| `IP_HASH_SALT` | generate once, never change | yes |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev; the real origin in prod | yes |
| `SUPABASE_DB_URL` | Supabase → Settings → Database, **session pooler** URI | migrations + backup workflow only |
| `NEXT_PUBLIC_ANALYTICS_SRC` | cookieless analytics provider | optional |
| `NEXT_PUBLIC_ANALYTICS_WEBSITE_ID` | same | optional |
| `NEXT_PUBLIC_PAYMENT_*` | GCash/Maya receiving details shown on the enroll page (§13) | optional |
| `RESEND_FROM` | Sender address once your domain is verified; defaults to Resend's sandbox sender, which only delivers to the account owner | optional |

Analytics stays completely off — no third-party bytes shipped — unless
**both** analytics vars are set. Payment instructions fall back to a
"published with the first cohort" line unless the payment vars are set.

---

## 5. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) on :3000 |
| `npm run build` | Production build (webpack) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run verify` | typecheck + lint + unit tests + build — **the definition of "done"** |
| `npm run test:e2e` | Playwright; live flows skip unless `E2E_AUTH=1` |
| `npm run make-admin -- <email>` | Sets the `admin` custom claim (user must have signed up first) |
| `npx tsx scripts/apply-migrations.ts [--seed]` | Applies pending migrations, optionally seeds |
| `npx tsx scripts/seed-courses.ts [slug]` | Loads `supabase/courses/*.json`. Add `--replace-questions` to overwrite question sets (discards `/admin` edits) |
| `npx tsx scripts/refresh-seed-content.ts [--write]` | Re-applies `seed.sql` text to rows that already exist. Dry run by default |

E2E environment switches: `E2E_AUTH=1` (run live flows), `E2E_DEV=1` (dev
server instead of a production build), `E2E_PORT` (default 3222),
`E2E_WORKERS` (default 3).

PowerShell: `$env:E2E_AUTH="1"; npm run test:e2e`.

---

## 6. Auth model — read this before touching auth

Firebase is the identity provider. Supabase never issues a token; it only
*verifies* Firebase JWTs via its Third-Party Auth integration.

Three things about this look wrong and are not:

1. **`user_id` columns are `text`, not `uuid`.** Firebase UIDs are strings.
2. **RLS compares `auth.jwt() ->> 'sub'`, not `auth.uid()`.** That is the
   correct accessor for a third-party JWT.
3. **`POST /api/auth/sync` sets a `role: "authenticated"` claim
   server-side.** Supabase RLS requires that claim; Firebase does not add it,
   and the blocking-function alternative is Blaze-tier only. After the sync
   the client force-refreshes its ID token.

Session handling:

- The client exchanges its Firebase ID token at `POST /api/auth/session` for
  a **Firebase session cookie** (`gn_session`, httpOnly, 5 days). A session
  cookie is revocation-aware; storing the raw ID token would not be.
- `src/middleware.ts` does an **optimistic cookie-presence check** for
  `/dashboard` and `/admin` — routing UX only. It cannot verify: the edge
  runtime cannot run `firebase-admin`.
- The real check is `getSessionUser()` (`src/lib/auth/session.ts`) in the
  dashboard and admin layouts, plus RLS underneath everything.
- `/admin` **404s** for non-admins rather than redirecting, so its existence
  is not advertised. Every admin server action independently calls
  `requireAdmin()` — a layout is not a security boundary for actions.

---

## 7. Architecture

```
src/
  app/            routes (App Router). Server components by default.
  components/     ui/ (shadcn), site/ (header, footer, shell), admin/, feature parts
  content/        static marketing copy and test configuration, typed
  lib/
    auth/         session cookie, client sign-in helpers, admin gate, anon id, schemas
    db/           THE data-access layer — every query in the app lives here
    assessment/   scoring, option ids, attempt ownership
    email/        Resend sender + React Email templates
    firebase/     client app + admin app singletons
    supabase/     browser client (anon key) + supabaseAdmin() (service role)
    account/      account deletion
    admin/        form-value coercion helpers
    analytics.ts  the ONLY analytics boundary
    rate-limit.ts Postgres-backed limiter
    storage.ts    bucket names, public URLs, owned object paths
    env.ts / env.server.ts   Zod-validated environment
  middleware.ts   security headers (CSP etc.) + optimistic auth redirect
```

Rules the codebase holds to:

- **Every query lives in `src/lib/db/*`.** Route handlers, pages, and actions
  call those functions; none of them build queries inline.
- **`supabaseAdmin()` is service-role and bypasses RLS.** It is `server-only`.
  Anything a user could influence is re-validated before it is used.
- **`"use server"` files may only export async functions.** Constants
  (`OPTION_IDS`, bucket names) live in plain modules — otherwise the build
  fails at page-data collection with a confusing error.
- **Content is data.** Marketing copy is typed objects in `src/content/`;
  lessons, questions, certifications, and blog posts are database rows edited
  from `/admin` with no deploy.

---

## 8. Database

Migrations are in `supabase/migrations/`, applied in filename order and
tracked in `schema_migrations`. **Never edit an applied migration** — add
`0006_…` and up.

### 0001 — profiles, rate limiting, audit

- **`profiles`** — `id` is the Firebase UID (text PK). Identity plus the
  talent-facing fields: `username`, `headline`, `bio`, `avatar_url`,
  `location`, `career_path`, `situation`, `skills text[]`, `is_public`,
  `role` (`student` | `admin` | `employer`), `marketing_consent`,
  `claims_synced`.
  RLS: own row select/update; `is_public = true` rows readable by anyone.
  Inserts happen only through `/api/auth/sync` with the service role.
  A `protect_profile_columns` trigger freezes `role`, `claims_synced`,
  `email`, and `id` for any caller that has a JWT — without it the "own
  profile update" policy would let a user promote themselves to admin from
  the browser.
- **`rate_limits`** — no policies at all; service role only.
  `check_rate_limit(key, max, window_seconds)` is an atomic
  insert-on-conflict counter returning whether the call is allowed.
- **`audit_log`** — append-only record of admin and system actions; service
  role only.

### 0002 — the assessment engine

- **`assessments`** — one row per test or exam (`type`: knowledge /
  practical / simulation / diagnostic), `passing_score`, `max_attempts`,
  `is_published`. Published rows are publicly readable.
- **`questions`** — prompt, `options jsonb`, `correct_option_id`,
  `competency`, `explanation`, `points`. **No select policy on purpose**:
  the answers must never leave the server. The server reads them with the
  service role and serves a stripped `PublicQuestion`.
- **`attempts`** — a taker's run. `user_id` is null for anonymous takers,
  who are tracked by an `anon_id` cookie instead; `ip_hash` is a salted hash
  used only for rate limiting.
- **`leads`** — captured emails; service role only.

### 0003 — certifications and credentials

- **`certifications`** — slug, title, level (`foundation` | `professional` |
  `advanced`), marketing fields, `skills`/`outcomes`/`roles` arrays,
  `price_php`, `is_free`, `passing_score`, and a unique `credential_prefix`.
- **`modules`** / **`lessons`** — curriculum. Lesson **content** is the paid
  product, so `lessons` is readable only when `is_preview = true` **or** the
  reader holds an `active`/`completed` enrollment for that certification.
- **`enrollments`** — `pending` → `active` → `completed` (or `rejected`),
  with `payment_method`, `payment_ref`, `amount_paid_php`. Users can read
  their own; **all writes go through server actions**, because status must
  not be client-controllable.
- **`lesson_progress`** — one row per user per completed lesson.
- **`credentials`** — `credential_code`, `holder_name`, `title`, `level`,
  `competencies jsonb`, `status` (`active` | `revoked` | `expired`),
  `revoked_reason`. **Publicly readable by design** — verification is the
  product. `user_id` is nullable so deletion can unlink without destroying
  the record.
- **`credential_sequences`** + `next_credential_code(prefix)` — issues
  `{PREFIX}-{YEAR}-{SEQ}` (e.g. `CAVA-2026-000001`) from a per-prefix,
  per-year counter behind a row lock. Never `count(*) + 1`; codes are
  permanent and never reused. The year is Asia/Manila.

### 0004 — content and data requests

- **`posts`** — DB-backed blog: slug, excerpt, `content_mdx`, category,
  cover image, status, `published_at`. Published rows are public; drafts are
  invisible to everyone but the service role.
- **`data_requests`** — RA 10173 subject requests (`access` | `correction` |
  `deletion`), status, resolution note, salted `ip_hash`. No policies —
  admin queue only.
- `touch_updated_at()` triggers on `posts`, `certifications`, `assessments`.

### 0005 — the talent layer

- **`portfolio_items`** — title, description, `image_path` (object path in
  the `portfolio` bucket), `project_url`, `sort_order`. Readable by anyone
  **only while the owner's profile is public**; also readable by the owner.
  Writes go through server actions.
- **`employer_enquiries`** — employer name/email/company/message, optional
  `talent_user_id` and `credential_code`, status (`new` | `handled` |
  `spam`). No policies — admin queue only.
- **`profiles.username`** gains a CHECK constraint
  (`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`) and a **case-insensitive unique
  index**, so `/talent/juana` and `/talent/Juana` cannot be two people.
- **Storage policies** for the `avatars` and `portfolio` buckets:
  public read; insert/update/delete only when the first path segment equals
  the caller's Firebase UID.

### 0006 — write policies

Drops `"own profile update"` on `profiles` and `"insert own attempt"` on
`attempts`. Both dated from phase 1, when the plan was for the browser to
write to Postgres directly; it never does. Left in place they meant a
signed-in user could set `is_public` without holding a credential, take a
username past the rules the server action applies, or create attempts around
the rate limiter. Nothing in the app used them.

### Seed (`supabase/seed.sql`)

Idempotent — fixed UUIDs, on-conflict guards, and question sets that insert
only when their assessment has none, so `/admin` edits survive a re-seed.

- The **AI Readiness Test**: 15 scenario questions across four competencies,
  calibrated so a casual daily ChatGPT user lands in *Developing*.
- **Certified AI Virtual Assistant** (₱1,499, prefix `CAVA`): 3 modules,
  9 lessons, 10-question exam.
- **AI Foundations Certificate** (free, prefix `AIF`): 2 modules, 5 lessons,
  8-question exam.
- Three **demo credentials**, each named with a `(Demo Record)` suffix and
  shown behind a banner on `/verify` — the seed has to be demonstrable
  without inventing people. Sequences are seeded past them so real issuance
  never collides.
- Two real blog posts.

---

## 9. Route map

### Public

| Route | Notes |
|---|---|
| `/` | Hero, the three-step ladder, the credential card |
| `/how-it-works`, `/about`, `/start-free`, `/companies` | Marketing |
| `/ai-test` → `/ai-test/quiz` → `/ai-test/results/[attemptId]` | The funnel. Quiz is ISR (`revalidate = 300`); results have an OG image |
| `/certifications` → `/certifications/[slug]` | Catalogue + product page, Course JSON-LD, prerendered via `generateStaticParams` |
| `/certifications/[slug]/enroll` | Auth-gated, `noindex` |
| `/blog` → `/blog/[slug]` | DB-backed MDX, category filter, Article JSON-LD, OG images |
| `/verify` → `/verify/[code]` | Public credential verification, credential JSON-LD, revoked / not-found states |
| `/talent/[username]` | Public talent profile, Person JSON-LD |
| `/employers` (+ `/employers/enquire`) | Directory with skill + certification filters; enquiry form |
| `/data-request` | RA 10173 subject requests |
| `/privacy`, `/terms` | Marked as drafts pending legal review |
| `/sitemap.xml`, `/robots.txt` | See §16 |

### Auth

`/login`, `/signup`, `/forgot-password` — email/password and Google.

### Dashboard (session required)

`/dashboard`, `/dashboard/courses`, `/dashboard/learn/[lessonId]`,
`/dashboard/assessments` (+ `/[slug]` exam player),
`/dashboard/credentials`, `/dashboard/profile` (profile editor + portfolio).

### Admin (admin claim required; 404 otherwise)

`/admin` (funnel metrics), `/admin/certifications` (+ `new`, `[id]` with
nested module/lesson editors), `/admin/questions` (+ `[assessmentId]` with a
competency-coverage panel), `/admin/posts` (+ `new`, `[id]`),
`/admin/enrollments`, `/admin/credentials` (revoke/reinstate),
`/admin/leads` (+ `/export` CSV), `/admin/enquiries`, `/admin/data-requests`.

### API

| Route | Purpose |
|---|---|
| `POST /api/auth/session` | ID token → session cookie |
| `POST /api/auth/sync` | Creates the profile row, sets the `authenticated` role claim |
| `POST /api/attempts`, `PATCH /api/attempts/[id]`, `POST /api/attempts/[id]/complete` | AI Readiness Test lifecycle |
| `POST /api/exams/[slug]/attempts`, `POST /api/exams/attempts/[id]/complete` | Certification exams; issues the credential on a pass |
| `GET /api/credentials/[code]/pdf` | Certificate PDF, generated on demand from the live record |
| `POST /api/lessons/[lessonId]/complete` | Records a lesson and answers with the next href. A route handler on purpose — see §19.9 |
| `POST /api/revalidate` | Admin-only cache purge, called by `AdminForm` after a save (§19.9). 404s for everyone else |

`POST /api/attempts` starts the **diagnostic only**. Certification exams go
through `/api/exams/[slug]/attempts`, which checks the enrollment and the
three-attempt allowance; the diagnostic route rejects any other assessment
type so those checks cannot be walked around.

---

## 10. The AI Readiness Test

Configuration is content (`src/content/ai-test.ts`), the engine is code
(`src/lib/assessment/scoring.ts`).

**Competencies and weights:** prompting & output quality 25 · tool fluency 20
· workflow integration 35 · judgment & verification 20.

**Bands:** Beginner 0–39 · Developing 40–69 · Job-Ready 70–84 · Advanced
85–100. Each band carries its own headline, message, and recommended path.

Scoring is pure and deterministic: each question is 0 or 1, a competency
score is `correct / total × 100`, and the overall score is the weighted
average, rounded. It runs against real answers **only on the server** — the
browser never receives `correct_option_id`.

Anonymous takers are tracked by a `gn_anon` cookie; attempts are linked to
the account on first sign-in.

---

## 11. Credentials and verification

- Issued automatically when an exam is passed. Codes come from
  `next_credential_code()` (§8), and issuance writes an `audit_log` entry and
  sends an email.
- Exam allowance counts **completed** attempts only, so an abandoned or
  crashed attempt does not burn one of three tries.
- `/verify/[code]` is public, has no login, and renders the holder,
  certification, per-competency breakdown, issue date, and status. Revoked
  credentials show the revocation reason. An unknown code gets a clear
  not-found state and a warning to treat the claim with caution — never a 500.
- Certificate **PDFs are generated on demand** from the live row rather than
  stored, so a revoked credential can never hand out a clean PDF.
- Credential pages are deliberately **absent from `sitemap.xml`**: they are
  reached by code, not by browsing, and listing them would turn a lookup tool
  into a directory of credential holders.
- The `CredentialCard` component has four states — `locked` (test results:
  what you could have), `goal` (dashboard), `earned` (profile), `verified`
  (public page).

---

## 12. Talent layer

- A public profile requires **both** `is_public` **and** at least one active
  credential. Opt-in alone is not enough: an unbacked profile here would be
  exactly the claim the product exists to replace.
- A private username and a nonexistent one both return **404**. Distinguishing
  them would confirm an account exists to anyone guessing.
- Usernames are unique **case-insensitively, in the database**, and the format
  is a CHECK constraint — the URL is an identity, and near-duplicates are a
  phishing surface.
- Avatars and portfolio images are compressed to **WebP in the browser**
  before upload (`browser-image-compression`) — mobile-first product, metered
  mobile data. The CSP allows `worker-src blob:` for exactly this.
- Uploads land in a folder named after the uploader's Firebase UID; the
  storage policies accept writes nowhere else, so a tampered path is refused
  by the database, not just by the component.
- `/employers` filters by skill and certification, and only ever offers
  facets that match somebody.

---

## 13. Payments and enrollment

Free certifications activate instantly — there is nothing to confirm. Paid
enrollment creates a `pending` row carrying the payment method and the
reference number from the learner's GCash/Maya receipt; an admin approves it
from `/admin/enrollments`, which activates the enrollment, writes an audit
entry, and emails the student.

Receiving details on the enroll page are **configuration, not code**. Set
these and the real instructions appear; leave them unset and the page says
the account is published with the first cohort:

```
NEXT_PUBLIC_PAYMENT_GCASH_NAME=
NEXT_PUBLIC_PAYMENT_GCASH_NUMBER=
NEXT_PUBLIC_PAYMENT_MAYA_NAME=
NEXT_PUBLIC_PAYMENT_MAYA_NUMBER=
```

There is no payment gateway. Manual confirmation is deliberate at this stage.

---

## 14. Security

- **No table is client-writable.** Every write in the app goes through a
  server action or a route handler that validates first, so migration 0006
  dropped the two policies that would have let a signed-in browser skip that
  validation (`profiles` update and `attempts` insert). Read policies stay.
- **RLS on every table.** Tables that hold other people's data
  (`leads`, `rate_limits`, `audit_log`, `data_requests`,
  `employer_enquiries`, `questions`, `credential_sequences`) have **no
  policies at all** and are reachable only through the service role.
  Disabling RLS to debug is forbidden.
- **Rate limiting** is Postgres-backed (there is no free WAF), keyed by
  `sha256(salt + ip)` per route, and **fails open** on database errors — a
  Supabase outage must not take the funnel down. Buckets:
  attempt-create 5/h, email-capture 3/h, auth 10/15min, data-request 5/h,
  enquiry 10/h, verify-lookup 30/h. Data requests have their own bucket so
  someone exercising a legal right is never blocked by a housemate taking the
  free test.
- **Raw IPs are never stored or logged** — only salted hashes.
- **Security headers** are set in middleware for every non-static route: CSP,
  HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `object-src 'none'`.
- **Admin mutations re-check the claim** inside the action or route handler
  and write an `audit_log` entry. The lead CSV export re-checks too, and the
  CSV is formula-injection safe with a UTF-8 BOM.
- **Open redirects**: the `next` parameter is validated to a same-origin
  pathname (`safeNextPath`).

---

## 15. Privacy (RA 10173)

- `/data-request` accepts access, correction, and deletion requests; they
  land in `/admin/data-requests`.
- Executing a deletion requires the admin to **type the requester's email
  back** — it is irreversible and one mis-click reaches a real person.
- `deleteAccountData()` runs in a deliberate order: the uploaded avatar and
  portfolio images in storage, then the credential unlink, then attempts, then
  leads, then the profile row (which cascades enrollments, lesson progress,
  and portfolio items), and the Firebase user **last**. The files go first
  because once `portfolio_items` cascades away nothing records which objects
  belonged to that person, and both buckets are public-read. The Firebase user
  goes last so that a part-way failure leaves an account that can still sign
  in and ask again, rather than orphaned rows nobody can reach. Two things are
  deliberately **retained**:
  - **Credentials**, unlinked (`user_id → null`). A credential is a public
    statement about a competency at a point in time; employers holding a code
    must keep getting an answer. `/privacy` promises exactly this.
  - **`audit_log` entries** — they record what staff did, and they are the
    evidence the erasure happened.

---

## 16. SEO and analytics

- `sitemap.ts` lists static routes, published certifications, published
  posts, and public talent profiles — but never credential pages (§11).
- `robots.ts` disallows `/admin`, `/dashboard`, and `/api/`.
- `EducationalOrganization` JSON-LD sitewide; `Course` on certification
  pages, `Article` on posts, `Person` on talent profiles, and a credential
  object on verification pages.
- Dynamic OG images for certifications, posts, and test results.
- **Analytics** is a plain script tag driven by two public env vars, never an
  npm dependency, so switching vendors is a config change and a deployment
  without the vars ships zero third-party bytes. Any cookieless provider with
  a `track(name, props)` global works (Umami, Plausible, Counter.dev).
  Cookieless is a requirement: no cookie means no consent banner between a
  first-time visitor and the free test.
- 11 of the 12 funnel events fire from the browser. `enrollment_confirmed`
  and `free_lesson_completed` are **counted from the database instead** — the
  first is a server-side change staff make, and the second belongs to a
  button that must work without JavaScript, so no browser beacon could
  observe either honestly. `/admin` reports the funnel from the database
  regardless of whether analytics is configured.

---

## 17. Testing

### Unit (Vitest) — `tests/unit/`

`auth-schemas.test.ts`, `scoring.test.ts`, `csv.test.ts`.

### E2E (Playwright) — `tests/e2e/`

Two viewport projects (Pixel 7 and Desktop Chrome) run every spec.

| Spec | Covers |
|---|---|
| `public-pages` | Homepage, protected-route redirects, legal pages, security headers |
| `auth-flow` | Sign up → sync → query under RLS → sign out |
| `funnel-flow` | Take the test → email gate → results → lead row |
| `rls-security` | Anonymous reads/writes are refused on profiles, attempts, questions, leads |
| `certification-flow` | Public verification; paid enrollment pending→active; **the phase gate**: enroll free → finish every lesson → pass the exam → credential issued → a logged-out stranger verifies the code |
| `content-admin` | Blog and category filter, drafts unreachable, sitemap/robots, admin 404s for non-admins, lead-export refusal, data-request queue, and **an admin writing, publishing, and editing a post through the real UI** |
| `talent-flow` | Credential gate on publishing, publish → stranger reads → enquiry → unpublish hides it, case-insensitive username collision, storage policy refuses anonymous writes |

Live flows **skip** unless `E2E_AUTH=1` with real keys in `.env.local`.

Things learned the hard way, all encoded in `playwright.config.ts` and
`tests/e2e/global-setup.ts`:

- **A dedicated port (3222), not 3000.** `reuseExistingServer` means anything
  already listening answers every request — an unrelated project on 3000 once
  turned the entire suite red.
- **Tests run against a production build by default.** `next dev` compiles
  routes on first request, which both slows the suite and *hides real bugs* —
  it hid the lesson-progression bug for two whole phases.
- **Workers capped at 3.** The app under test is one Node process; more
  browsers only add queueing until live flows blow their budgets.
- **`globalSetup` warms the server, including one real server-action
  submission.** The first action dispatch measured about two minutes cold
  against about two seconds warm, and parallel tests all queue behind it and
  time out together.
- **Gated specs wipe `rate_limits` before each test** — a local suite shares
  one IP and the limiter (correctly) blocks it.
- Resend refuses `@example.com` recipients, so live runs log
  `[email] send failed`. That is expected.


### Diagnosing a form or navigation that hangs on "Saving…"

Both production bugs in §21 presented identically — a disabled button that
never comes back — and both looked exactly like a slow machine. This is the
recipe that separated them from load, in the order that costs least.

1. **Run the failing test alone, serially.** If it still fails, it is not
   contention and no amount of widening timeouts will help.

   ```
   $env:E2E_AUTH="1"
   npx playwright test tests/e2e/<spec> --project=desktop --workers=1 --retries=0 -g "<title>"
   ```

2. **Watch the server, not the test.** Playwright hides the app's stdout, so
   start the server yourself and let Playwright reuse it (`reuseExistingServer`
   is on when `CI` is unset):

   ```
   npm run build
   npm run start -- --port 3222 > server.log 2>&1
   ```

   Add `console.log("[trace] …", Date.now())` at the top and bottom of the
   action, and in the page it re-renders. If the traces show the work
   finishing in a second while the browser waits ninety, **the server is not
   the problem** — stop looking at it.

3. **Watch what the browser actually received.** A small Playwright script
   run from the repo root (so it resolves `playwright` and
   `@supabase/supabase-js`) beats reading a trace zip:

   ```js
   page.on("response", (r) => {
     if (r.request().method() === "POST") console.log(r.status(), r.url());
   });
   page.on("requestfailed", (r) => console.log("FAILED", r.url(), r.failure()?.errorText));
   ```

   A `200` with `content-type: text/x-component` whose body never ends is the
   signature of a transition that will never commit.

4. **Bisect with a runtime toggle, not with rebuilds.** A build takes minutes
   on this machine, so put the suspect behind `process.env.SOMETHING` — server
   code reads it at runtime, and a client component can take it as a prop from
   its server parent. One build then answers several questions:

   ```
   TRACE_SKIP="profile,talent" npm run start -- --port 3222
   ```

   Run the same test three times per case. Both of these bugs failed 2-of-3,
   not 3-of-3, so a single green run proves nothing.

5. **Confirm the converse.** Removing the suspect and passing is half the
   evidence; putting it back and failing is the other half.

Remember to strip every trace and toggle before committing.

---

## 18. Launch checklist

Everything here is credentials, content, or a business decision — no missing
code.

| # | Item | Owner |
|---|---|---|
| 1 | ~~Repo secrets for the keep-alive and backup workflows~~ — **done, both verified running** | ✅ |
| 2 | Real GCash/Maya receiving name + number → the `NEXT_PUBLIC_PAYMENT_*` vars (§13) | User |
| 3 | Sign up on the live site, then `npm run make-admin -- <email>` | User |
| 4 | Verify the Resend sending domain (SPF + DKIM) | User |
| 5 | Legal review of `/privacy` and `/terms`; NPC registration decision | User |
| 6 | GN Academy ↔ MAZAL / GN Club brand relationship (unblocks the About page) | User |
| 7 | Production hosting + domain — note that Vercel Hobby prohibits commercial use | User |
| 8 | Cookieless analytics account → `NEXT_PUBLIC_ANALYTICS_*` | User |
| 9 | Course content beyond the seeded lessons; video lessons (`lessons.video_url` already exists) | Either |
| 10 | First real certification cohort | User |

Deploying: set every variable from §4 in the host's environment (with
`NEXT_PUBLIC_SITE_URL` pointing at the real origin), build with
`npm run build`, serve with `npm run start`. The app needs a Node runtime —
it is not exportable as static files.

### Operations

- `.github/workflows/keep-alive.yml` pings Supabase every 3 days; the free
  tier pauses a project after 7 days of inactivity. Verified green.
- `.github/workflows/backup.yml` takes a weekly `pg_dump`, gzipped, kept 90
  days as a workflow artifact. A stopgap, not a real backup strategy — the
  free tier has no restorable automatic backups. Verified producing a real
  dump (80 KB gzipped, ~2,300 lines).
- Both workflows skip cleanly when their secrets are unset.

Three things about the backup are load-bearing and were each learned by
watching it fail:

- It installs **PostgreSQL 17** from PGDG and calls
  `/usr/lib/postgresql/17/bin/pg_dump` by absolute path. Ubuntu ships client
  16, which refuses to dump a 17 server, and `/usr/bin/pg_dump` is Debian's
  `pg_wrapper` — it resolves to 16 even once 17 is installed.
- It sets `pipefail`. Without it `pg_dump | gzip` exits with *gzip's* status,
  so for months the job archived a 170-byte gzip of nothing and reported
  success every week.
- It verifies the archive with `grep -c`, never `grep -q`. `-q` exits on the
  first match, SIGPIPEs the `gzip` feeding it, and under `pipefail` fails the
  job on a dump that is perfectly good.

---

## 19. Sharp edges

1. **Never "fix" the auth oddities** (§6): text `user_id` columns,
   `auth.jwt() ->> 'sub'` in policies, and the `role: authenticated` claim
   the sync route sets. Disabling RLS to debug is forbidden.
2. **`SUPABASE_SERVICE_ROLE_KEY` holds an `sb_secret_…` key** — the modern
   service-role equivalent, verified to bypass RLS from Node and be refused
   from browsers. The value labelled "service role" in the dashboard turned
   out to be the anon key twice.
3. **Build with webpack** (`next build`, no `--turbopack`).
4. **Keep `radix-ui` in `optimizePackageImports`** or every page regains
   about 78 kB.
5. **Never edit an applied migration.** Add `0006+`. The seed is idempotent.
6. **PowerShell mangles Unicode in files.** Do not round-trip file content
   through `Get-Content`/`Set-Content`; use an editor tool or a Node/Python
   script.
7. **`"use server"` files may only export async functions.** Constants belong
   in a plain module, or the build fails confusingly at page-data collection.
8. **Actions that chain navigations must return an href, not `redirect()`.**
   Once the App Router has performed one action redirect, the next one an
   action returns on the arrived page is silently dropped — that is what made
   lesson progression need a second click in production.
9. **Never call `revalidatePath` inside a server action that returns state to
   `useActionState`.** In a production build the action and its re-render both
   finish on the server in under a second, and the browser still sits on a
   disabled "Saving…" button forever — measured, reproduced with a single call
   against an unrelated fully dynamic route, and gone the moment the call is
   removed. `next dev` hides it entirely. Cached paths are purged from
   `POST /api/revalidate` instead, fired by `AdminForm` after a successful
   save; `AdminFormState` carries `revalidate` and `redirectTo` for exactly
   this. Note that most paths are not cached at all (§9 route map), so most of
   these calls never did anything in the first place.

    The wider lesson, learned three times in one session: **an action's
    response carries a re-render of the current route, and that stream stalls
    under concurrency even when the action's own work has finished.** When a
    mutation exists to do some work and then send the user somewhere — rather
    than to update the page in place — use a route handler and navigate from
    the client. That is what `/api/lessons/[lessonId]/complete` and
    `/api/revalidate` both are. Moving lesson completion off actions took the
    suite from 62/64 in 5.1 minutes to 64/64 in 2.2.
10. **Never call `router.refresh()` immediately after `router.push()` inside
    the same transition.** Same failure as item 9 seen from the client side:
    the action returns, the server has nothing left to do, and the transition
    never completes, so the button stays on "Saving…". Push and let the
    destination render; it is server-rendered per request anyway.
11. **Measure e2e failures before "fixing" them** — §17 has the recipe.
    Three separate red suites
   were the environment rather than the code — and one was a genuine
   production bug that dev mode hid. Run a failing test alone, and with
   `--workers=1`, before touching anything.
12. **Commit style**: conventional commits, one commit per feature, pushed
    individually. Timestamps stay real.
13. **Lighthouse readings on a loaded machine are worthless in absolute
    terms.** Measure a known control page in the same window and compare
    against it — the method that settled the Phase 3 gate.

---

## 20. State files

| File | What it is |
|---|---|
| `PROGRESS.md` | Phase-by-phase checklist and the resume point |
| `DECISIONS.md` | Every judgement call: decision · reason · alternative rejected |
| `BLOCKED.md` | Items needing an action only the human can take |
| `HANDOFF.md` | Session-to-session narrative and next actions |

---

---

## 21. Courses, chapter quizzes and reviewed assignments

There are two shapes of course, and they end differently.

**Exam courses** (the original two: AI Foundations, Certified AI Virtual
Assistant) end in one final exam. Passing it issues the credential
automatically. `certifications.requires_assignment` is false.

**Assignment courses** (the five newer ones) have a quiz attached to each
chapter and end in a written assignment that a human reads. The credential is
released when a reviewer approves it, not when a score crosses a line.

### The learner's path through an assignment course

1. Read a chapter's lessons. Finishing the last one leads **into that chapter's
   quiz**, not into the next chapter.
2. Pass the quiz. Chapter quizzes are formative: unlimited retakes, and passing
   one never issues anything.
3. Repeat for all four chapters.
4. The assignment unlocks only once every lesson is read and every chapter quiz
   passed. That gate is enforced in the server action, not just on the page,
   because a page is not a gate and the review queue is the expensive part.
5. Submit. A reviewer approves, requests changes, or fails it. Returning work
   requires a written note, since it is the only feedback the learner gets.
6. Approval issues the credential and emails it.

### Where a credential can be issued

`src/lib/credentials/issue.ts` — `maybeIssueCredential()` — and nowhere else.
Both routes to a certificate (an exam pass, and an assignment approval) call
it, and it re-reads enrollment, the approved submission and any existing
credential from the database rather than trusting its caller. Duplicating those
conditions across two call sites is how a credential eventually reaches
somebody who did not earn it.

For an assignment course, which has no final exam to score, the credential's
competency breakdown is computed from the learner's best attempt at each
chapter quiz. A credential with no breakdown is worth noticeably less to the
employer reading it.

### Course content lives in files

`supabase/courses/*.json` is the authored source. Load it with:

```
npx tsx scripts/seed-courses.ts                 # every course
npx tsx scripts/seed-courses.ts ai-essentials   # one
```

Idempotent and deliberately conservative. Courses, chapters and lesson text are
refreshed on every run; **quiz questions are inserted only when a chapter quiz
has none**, so an admin's edits in `/admin` survive a reseed. Nothing is ever
deleted. Chapters are matched on `slug` and lessons on `(module_id, slug)`.

> Chapters are matched on slug for a reason. They used to be matched on title,
> and renaming a chapter then inserted a *second* module and re-created its
> lessons as new rows, silently resetting every enrolled learner's progress for
> that chapter and re-locking their assignment. Migration 0008 added
> `modules.slug` to give a chapter a stable identity.

### Writing course content

Three rules, each of which was learned by an adversarial review catching a
draft that broke it:

1. **Never invent a statistic.** No "half of all AI mistakes", no "70% of the
   work", no "nine times out of ten". If a number would help and you do not
   know it, describe the shape instead.
2. **Never describe a product feature you cannot verify.** This matters most in
   the Claude course. Prices, plan tiers, limits, and named buttons all change
   or were never true.
3. **Quiz options must all be roughly the same length, and the answer key must
   be spread across a, b, c and d.** Drafts consistently made the correct answer
   the longest option, which lets a test-wise learner score well having read
   nothing. That would hollow out the credential the whole product rests on.
   Measured on what shipped: correct-is-longest in about 11% of questions,
   below the 25% that guessing would give.

---

## 22. The public site is a sales page; courses are behind the login

`/certifications`, `/certifications/[slug]` and `/start-free` all require a
session and redirect to `/login?next=…`. The landing page describes what is
sold and links only to sign-up and sign-in — it contains no link into the
catalogue at all, which `tests/e2e/public-pages.spec.ts` asserts.

Consequences worth knowing:

- Course pages are **out of the sitemap** and disallowed in `robots.txt`.
  Listing a URL that answers with a redirect wastes crawl budget and puts a
  dead result in front of whoever finds it.
- `/certifications/[slug]` lost its `generateStaticParams` and ISR window. It
  was prerendered and public; it is now `force-dynamic` and per-learner.
- **This costs organic discovery.** Course pages used to be indexable, with OG
  cards and `Course` JSON-LD. That was traded for the gate deliberately, at the
  client's request. The AI Readiness Test at `/ai-test` is still public and is
  now the only free entry point a stranger can reach.

Landing copy is data, in `src/content/landing.ts`. A non-developer edits it.

### Motion

`motion` v13 (the library formerly called framer-motion), wrapped in
`src/components/motion/reveal.tsx` so the whole page moves the same way.
`Reveal`, `Stagger`/`StaggerItem`, and a slow `AuroraBackdrop` behind the hero.

Two rules hold it together: nothing travels more than a few pixels, and every
animation collapses to a plain fade under `prefers-reduced-motion`. The second
is not decoration — for some people parallax and long travel cause actual
nausea.

> `npm create @motion-script@latest` does not exist on npm, and `npm create`
> scaffolds a new project rather than adding to this one. `motion` is the real
> package.

### Theming

`next-themes` was already a dependency but nothing was wired to it.
`ThemeProvider` sits in the root layout with `attribute="class"`, which is what
the `@custom-variant dark` rule in `globals.css` keys off. `<html>` carries
`suppressHydrationWarning`, because next-themes sets that class before React
hydrates and the markup differs by design.

The toggle is three-way: light, dark, **system**. System is a real option
rather than a hidden default — a phone that switches at sunset should take the
site with it, and someone who set that up should be able to see it is being
honoured. The control renders nothing until mounted, since the server cannot
know which theme to highlight.

---

## 23. The signed-in shell

`src/app/dashboard/layout.tsx` is a persistent sidebar (START / PROGRAM /
CONNECT) carrying live state: profile completeness as a percentage, a count of
active courses, a count of credentials. It collapses to a scrollable top bar
below `lg`, because a 240px rail on a 360px screen is not navigation.

`/dashboard` shows one card per enrolled course with a status badge and **the
single next action** for it — Not started, In progress, Quizzes left,
Assignment ready, Under review, Changes requested, Exam ready, Certified. The
question someone opens that page with is "what do I do now", so each card
answers exactly that rather than offering a menu.

Profile completeness lives in `src/lib/dashboard/completeness.ts` and counts
only fields an employer reads. Location is excluded because it defaults to
"Philippines" for everyone, and showing 20% to someone who has filled in
nothing is worse than useless as a prompt.

---

## 24. No em dashes in user-facing text

The client's objection is that the em dash reads as machine-written, and they
are right that it is a tell. 250 of them were removed from `src` and
`supabase/seed.sql`, and every course file was rewritten to drop them.

`tests/unit/no-em-dashes.test.ts` fails the build if one comes back.

Two things about the rule:

- **Removing one is a rewrite, not a replacement.** Swapping `—` for `-` is
  just as obvious a tell, and a comma splice reads worse than the dash did.
  Two complete thoughts usually want a full stop; an explanation usually wants
  a colon; an aside usually wants commas or cutting.
- **Developer comments are exempt**, and the test skips them. The request was
  about text a user reads, and several comments here use dashes while
  explaining decisions that cost real time to work out.
- **The test scans `scripts/` too, not just `src/`.** It did not at first, and
  `scripts/seed-courses.ts` built a chapter quiz title as `${mod.title} —
  chapter quiz` and wrote it into `assessments.title`, where learners read it
  on their courses page. The guard was green the whole time.
  `scripts/refresh-seed-content.ts` is exempt by name, because finding em
  dashes is what it does.

Checking the live database means checking **every** table, not the four that
hold obvious prose. The first sweep queried `questions`, `lessons`, `posts` and
`certifications`, reported clean, and left eighteen em dashes sitting in
`assessments.title`. The honest query walks `information_schema` and tests
`to_jsonb(t)::text` per table.
