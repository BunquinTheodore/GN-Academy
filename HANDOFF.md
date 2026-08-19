# GN Academy — Session Handoff

**Written:** 19 August 2026 · **Read this first, then `PROGRESS.md`,
`DECISIONS.md`, `BLOCKED.md`.**

GN Academy is a certification + talent platform for Filipinos entering the
AI-powered workforce. Product loop: free **AI Readiness Test** → email capture
→ free course → paid certification → **publicly verifiable credential** →
talent marketplace. Operating rules: free tiers only, Firebase Auth + Supabase
Postgres (never Supabase Auth), RLS on everything, mobile-first from 360px,
`npm run verify` green before "done", never fabricate social proof.

---

## 1. Where things stand

| Phase | State |
|---|---|
| 1 — Foundation | ✅ merged to `main` |
| 2 — Funnel | ✅ merged to `main` |
| 3 — Certification & credentials | ✅ **merged to `main` this session** |
| 4 — Admin & content | ✅ **merged to `main` this session** |
| 5 — Talent layer | 🔨 **built on `phase-5-talent`, NOT merged** — see §4 |

`main` is a complete, working product through Phase 4. The talent layer is
built and committed on its branch, `npm run verify` is green on it, and most
of its e2e passes — one test is still red for load reasons (§4.1).

### What this session did

**Phase 3 closed.** The Lighthouse gate that blocked the merge was resolved
with a paired control: the homepage (known 94–95 on a quiet machine) read
83–86 in the same window as catalogue 81–82 and product 83–91, so all three
were depressed equally by CPU contention rather than by a regression. Also
banked a real fix — `generateStaticParams` prerenders both product pages,
warm TTFB 578ms → 13ms.

**Phase 4 built and merged.** Admin CRUD for certifications, curriculum, and
questions; credential revocation; leads + CSV export; enrollment-approved
email; a DB-backed MDX blog; sitemap/robots/Organization JSON-LD/OG cards;
cookieless analytics wiring; the data-request queue with real account
deletion; and funnel metrics on `/admin`.

**Phase 5 built.** Migration 0005, storage buckets, profile editor, public
talent profiles, employer directory, enquiry queue, `/companies`.

### Real bugs found and fixed (worth knowing about)

1. **Lesson progression needed a second click in production.** Chained action
   redirects are dropped by the App Router: once it has performed one, the
   next redirect an action returns on the arrived page is silently ignored.
   `completeLessonAction` now returns the href and the client navigates.
   `next dev` hid this for two whole phases.
2. **The entire e2e suite had been running against another project's server.**
   `reuseExistingServer` + port 3000 meant an unrelated app on the same
   machine answered every request. Fixed with a dedicated port (3222).
3. **Data requests shared the email-capture rate-limit bucket** (3/hour), so
   someone exercising a legal right could be blocked by a housemate taking
   the free test. Now has its own bucket.
4. **A ~2-minute cold cost on the first server-action dispatch**, which every
   parallel test queued behind and timed out together. `globalSetup` now
   warms it with a real action submission.

---

## 2. How to run everything

```
npm run dev                      # dev server
npm run verify                   # typecheck + lint + 21 unit tests + build
npm run test:e2e                 # public tests only (live ones skip)
$env:E2E_AUTH="1"; npm run test:e2e          # all live tests (PowerShell)
$env:E2E_AUTH="1"; npx playwright test tests/e2e/<spec> --workers=1
npx tsx scripts/apply-migrations.ts --seed   # idempotent
npm run make-admin -- someone@email.com      # after they've signed up once
```

**E2E now runs against a production build by default** on port 3222.
`E2E_DEV=1` swaps to the dev server for fast iteration; `E2E_PORT` and
`E2E_WORKERS` override the rest. Workers are capped at 3 — the app under test
is one Node process and more browsers only add queueing.

---

## 3. Sharp edges the next session must know

1. **Never "fix" the auth oddities.** `user_id` columns are `text` (Firebase
   UIDs), RLS compares `auth.jwt() ->> 'sub'`, and the sync route must keep
   setting `role: authenticated`. Disabling RLS to debug = forbidden.
2. **`SUPABASE_SERVICE_ROLE_KEY` holds an `sb_secret_…` key** (modern
   equivalent, verified). Don't swap in the pasted "service role" JWT — it
   was the anon key.
3. **Build with webpack** (`next build`, no `--turbopack`).
4. **`radix-ui` stays in `optimizePackageImports`** or every page regains
   ~78 kB.
5. **Never edit an applied migration.** Add 0006+. Seed is idempotent.
6. **PowerShell mangles Unicode in files.** Do NOT round-trip file content
   through `Get-Content`/`Set-Content`. Use Write/Edit or a Python/Node
   script for file surgery.
7. **`"use server"` files may only export async functions.** Constants
   (`OPTION_IDS`, bucket names) live in plain modules — this breaks the build
   at page-data collection, with a confusing error.
8. **Don't put `onSubmit` on a form whose `action` is a server action.** React
   falls back to a native POST and the resulting 303 gets aborted. Use the
   button's `onClick`, or a client wrapper that calls the action directly.
9. **Measure e2e failures before "fixing" them.** Three separate red suites
   this session were the environment, not the code — and one was a genuine
   production bug that dev mode hid. Run the failing test alone and with
   `--workers=1` before touching anything.
10. Commit style: conventional commits, **one commit per feature, pushed
    individually** (user's explicit request). Timestamps stay real.
11. Email sender degrades gracefully; Resend rejects `@example.com`
    recipients, so e2e runs log `[email] send failed` — that is expected.

---

## 4. Immediate next actions

### 4.1 Finish Phase 5 (start here)

1. **Get `tests/e2e/talent-flow.spec.ts` fully green.** The failing test is
   *"a username is not silently stolen from another account"*. It times out
   waiting for a profile save when it loses the race for the first
   `saveProfileAction` dispatch; the same test passes in ~17s when it wins.
   Options, cheapest first:
   - Run the talent describe with `test.describe.configure({ mode: "serial" })`
     so its two heavy tests don't compete.
   - Extend `globalSetup` to warm `saveProfileAction` specifically (it needs
     an authenticated session, so this means signing a throwaway user in).
   - Accept and widen: budgets are already 90s there.

   Verify the feature itself works before spending long on the test — it
   already passed on desktop in an earlier run.

2. **Run the full suite** (`$env:E2E_AUTH="1"; npm run test:e2e`) — six specs,
   should be ~60 tests — and confirm green.
3. **Lighthouse the new public routes** (`/employers`, `/talent/[username]`,
   `/companies`) on a quiet machine, using the paired-control method in
   DECISIONS.
4. **Merge `phase-5-talent` → main** (`git merge --no-ff`) and push.

### 4.2 Then

- Re-measure Lighthouse across all public routes on a machine with headroom.
  Everything measured this session was ~10 points below its known-quiet value,
  including the control, so absolute numbers are still unconfirmed.
- `npm audit` reports 9 vulnerabilities (3 high) — all pre-existing, all in
  the build toolchain via `next` (postcss, sharp). Not runtime attack surface.
  `npm audit fix --force` would move Next; decide deliberately.

---

## 5. Remaining work to launch

Nothing below is blocked on code that doesn't exist — it's decisions,
credentials, and content.

| # | Item | Owner |
|---|---|---|
| 1 | `gh auth login`, then set repo secrets so keep-alive + backup workflows run | **User** |
| 2 | Real GCash/Maya receiving name + number → enroll page copy | **User** |
| 3 | Sign up on the site, then `npm run make-admin -- <email>` | **User** |
| 4 | Verify the Resend sending domain (SPF + DKIM) | **User** |
| 5 | Legal review of `/privacy` + `/terms`; NPC registration decision | **User** |
| 6 | GN Academy ↔ MAZAL / GN Club brand relationship | **User** |
| 7 | Production hosting + domain (Vercel Hobby prohibits commercial use) | **User** |
| 8 | Cookieless analytics account → `NEXT_PUBLIC_ANALYTICS_*` | **User** |
| 9 | Real course content beyond the seeded lessons; video lessons | Either |
| 10 | First real certification cohort | **User** |

Everything the platform needs in order to *function* is built. Items 2, 4, 7
and 8 are the ones that actually gate taking money and going live.

---

## 6. File map

- **State/docs:** `PROGRESS.md`, `DECISIONS.md` (every judgement call),
  `BLOCKED.md`, `README.md`, this file
- **Config:** `next.config.ts`, `src/middleware.ts` (security headers,
  optimistic auth, CSP incl. `worker-src blob:` and the analytics origin),
  `playwright.config.ts` (prod build, port 3222, 3 workers, globalSetup),
  `.env.example`, `.github/workflows/`
- **DB:** `supabase/migrations/0001..0005`, `supabase/seed.sql`,
  `scripts/apply-migrations.ts`, `scripts/make-admin.ts`
- **Auth:** `src/lib/firebase/`, `src/lib/supabase/`, `src/lib/auth/`
  (`admin.ts` holds `requireAdmin` + `auditLog`), `src/app/api/auth/`
- **DAL (all queries live here):** `src/lib/db/{profiles,assessments,attempts,
  leads,certifications,enrollments,progress,credentials,exams,posts,
  data-requests,metrics,talent}.ts`
- **Engine:** `src/lib/assessment/`, `src/lib/rate-limit.ts`,
  `src/lib/{analytics,format,csv,storage}.ts`, `src/lib/admin/form-values.ts`,
  `src/lib/account/delete.ts`, `src/lib/email/`
- **Public routes:** homepage, marketing, `(auth)`, `ai-test/`,
  `certifications/`, `blog/`, `verify/`, `talent/[username]`, `employers/`
  (+ `enquire`), `companies`, `data-request`
- **Dashboard:** `courses`, `learn/[lessonId]`, `assessments`, `credentials`,
  `profile` (editor + portfolio)
- **Admin:** `certifications/`, `questions/`, `posts/`, `enrollments/`,
  `credentials/`, `leads/` (+ `export`), `data-requests/`, `enquiries/`,
  and the funnel overview at `/admin`
- **Components:** `credential-card.tsx` (the signature element),
  `admin/{admin-form,field,admin-nav}`, `image-upload.tsx`, `track-view.tsx`,
  `analytics-script.tsx`, `site/`, `ui/`
- **Tests:** `tests/unit/{auth-schemas,scoring,csv}.test.ts`,
  `tests/e2e/{public-pages,auth-flow,funnel-flow,rls-security,
  certification-flow,content-admin,talent-flow}.spec.ts`,
  `tests/e2e/global-setup.ts`

---

## 7. Session-start ritual

1. Read `HANDOFF.md` → `PROGRESS.md` → `DECISIONS.md` → `BLOCKED.md`
2. State the phase and next three tasks
3. `npm run verify` — fix anything broken before adding features
4. Work; commit per feature; push each; update state files as you go
