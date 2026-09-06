# IMPROVEMENTS

A point-in-time audit (2026-09-06) of bugs, risks, and opportunities across
GN Academy. Companion to `README.md` (what exists and why), `DECISIONS.md`
(judgement calls already made), `BLOCKED.md` (things only a human can do),
and `HANDOFF.md` (session-to-session narrative). This file exists so a
redesign or hardening pass has one place to start instead of re-deriving the
same findings.

Every item below was verified against the actual code, not assumed. Items
already tracked elsewhere are marked **[tracked]** and cross-referenced
rather than duplicated as new work.

Severity scale: **critical** (do this before anything else) · **high** ·
**medium** · **low** · **nice-to-have**.

---

## 0. Do this first

| # | Item | Why it's #1 |
|---|---|---|
| 1 | **Rotate the live admin password** — still `12345678` per `HANDOFF.md` §4.1 **[tracked]** | The account it protects reads every lead's phone number, can delete users, approves assignments, and issues credentials. `/admin` is on the public internet. Zero code changes needed, five minutes of work, blocks everything else in priority. |
| 2 | **Rotate the three secrets pasted into a chat transcript** — Supabase service key, DB password, Resend key **[tracked, `HANDOFF.md` §4.3]** | If that transcript is stored anywhere shared, those are live credentials in a search index. |
| 3 | **CSP `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`** — `src/middleware.ts:35` | This is the largest *code* security gap found in this audit. It defeats most of what a CSP is for. See §1.1. |

---

## 1. Security

### 1.1 CSP allows `'unsafe-inline'` and `'unsafe-eval'` — high
`src/middleware.ts:35`. If any script tag or `eval`-able string ever reaches
the page (stored XSS via admin-authored MDX content is the realistic vector,
since lesson/blog bodies render through `next-mdx-remote`), the CSP will not
stop it from executing. Exploitability is lower than a public-UGC site
because MDX content is admin-only, not user-submitted, but this is still the
CSP's main job left undone. Action: determine whether Next's inline
hydration scripts and Firebase/Google Sign-In actually require these
directives; if so, move to a nonce-based or hash-based CSP rather than
blanket-allowing both.

### 1.2 Client-supplied `avatar_path` trusted without server-side ownership check — low
`src/app/dashboard/profile/actions.ts:95-104`. Storage write policies already
restrict uploads to the caller's own UID folder, so this is not an
account-takeover path, but the app layer never verifies
`avatarPath.startsWith(user.uid + "/")` before writing it to the profile.
A user can currently point their own profile at *any other public object* in
the bucket. Cheap fix, worth doing on principle: never trust client input
just because a downstream policy happens to catch the bad case.

### 1.3 Storage bucket MIME/size limits aren't in version control — medium
Grepped the whole repo for `createBucket` / `fileSizeLimit` /
`allowedMimeTypes` — zero matches. README §3 and `DECISIONS.md` both say the
buckets were "created programmatically with the service role" with
size/MIME limits, but that script is gone or was never committed. Today's
live buckets may still enforce this — there's just no reproducible proof or
disaster-recovery path. Action: commit the bucket-creation script (or a
migration-adjacent one-off script) so a fresh environment gets the same
guarantees.

### 1.4 No explicit CSRF/origin check on route handlers — low/medium
Route handlers under `src/app/api/**` (session, sync, attempts, exams,
lessons/complete, revalidate) rely implicitly on `sameSite: "lax"` cookies
(`session.ts:19`, `anon.ts:19`) to block cross-site POST. That's a reasonable
mitigation but it's implicit, not defended-in-depth, and these are
hand-written endpoints rather than framework-guaranteed Server Actions.
Consider an explicit `Origin`/`Sec-Fetch-Site` check on state-changing route
handlers.

### 1.5 Clean findings, confirmed by direct inspection
- No raw/concatenated SQL anywhere in `src/lib/db/*` — every one of the 15
  files uses the Supabase query builder exclusively. No injection surface.
- No committed secrets, no hardcoded keys/tokens/passwords (grepped
  the tree; only `.env.example` is tracked).
- Admin CSV export (`src/lib/db/leads.ts`) is genuinely formula-injection
  safe with a UTF-8 BOM, as documented — confirmed at the source.
- `img-src https:` in the CSP is broad but no user-controlled `<img>`
  injection point exists to exploit it.

### 1.6 Already-tracked items, cross-referenced (not re-discovered here)
- `npm audit`: 9 findings, all in build tooling, non-breaking `overrides`
  fix proposed — **[tracked, `HANDOFF.md` §4.4]**. Not independently
  re-run in this audit (no registry access in the audit environment).
- Resend sending domain unverified, so email only reaches the account
  owner — **[tracked, `BLOCKED.md` #2]**. This is now the largest
  *functional* gap in the product per `HANDOFF.md` §4.2: an approved
  assignment issues a credential with no email to the learner.

---

## 2. Code quality / architecture

- **Unusually clean.** Zero `TODO`/`FIXME`/`HACK` comments, zero `: any` /
  `as any`, zero stray `console.log` anywhere in `src/`. Nothing to fix here.
- `src/app/dashboard/page.tsx` (403 lines) still serializes per-course DB
  reads in a loop — **[tracked, `HANDOFF.md` §4b]**. Confirmed still present,
  not re-scoped here.
- `SiteHeader` reading the session cookie makes every public marketing page
  dynamic, killing prerendering on `/`, `/about`, `/blog`, etc. —
  **[tracked, `HANDOFF.md` §4b]**. The documented fix (move the two
  auth-dependent buttons into a small client component reading Firebase auth
  state) still stands and hasn't been done.
- README §19's "sharp edges" rules were spot-checked against
  `lessons/[lessonId]/complete/route.ts`, `attempts/[attemptId]/complete/route.ts`,
  and `profile/actions.ts` — all comply. No regressions.

---

## 3. Testing gaps

7 unit test files exist against 45 files in `src/lib/`. Most of the untested
ones are DB-access functions reasonably covered by the e2e suite instead, but
two gaps stand out as genuinely worth closing regardless of whether a bug
currently exists:

- **`src/lib/credentials/issue.ts` (`maybeIssueCredential`) has no unit
  test — high priority.** README calls this out explicitly as "the single
  place a credential is released, and nowhere else," with both call sites
  (exam pass, assignment approval) depending on it re-validating every
  prerequisite from the database. This is the highest-value function in the
  codebase to leave untested: a regression here either double-issues a
  credential or silently fails to issue one earned.
- **`src/lib/assessment/ownership.ts` (`canWriteAttempt`) has no unit
  test.** Short (17 lines) but it's the sole authorization boundary deciding
  whether a caller may write to a given attempt. Authorization boundaries
  deserve deterministic unit tests, not just e2e coverage.
- **`src/lib/rate-limit.ts` has no unit test.** The fail-open-on-DB-error
  behavior is a deliberate, documented design choice (`DECISIONS.md`) that a
  future refactor could silently invert with nothing to catch it.

---

## 4. Performance

- **Only 3 of 15 `src/lib/db/*` files use `.limit()`/`.range()`**
  (`credentials.ts`, `leads.ts`, `exams.ts`). `listAllCertifications`,
  `listAllPosts`, `listPendingEnrollments`, `listModules`,
  `listPublicTalent` have no pagination, and neither do the admin/public
  pages that call them. Harmless at current scale (single-digit courses, a
  few dozen enrollments); becomes a real cost once the talent directory or
  enrollment queue grows past a few hundred rows. Backlog item, not urgent.
- `next/image` optimization is deliberately disabled
  (`images.unoptimized: true` in `next.config.ts`) because Vercel Hobby's
  image-transform cap was exhausted — a documented, deliberate tradeoff, not
  an oversight. Revisit only if the hosting plan changes.
- No N+1 patterns found in the DB layer itself beyond the already-tracked
  dashboard loop (§2).

---

## 5. Accessibility

No new violations surfaced. The design system already has several
deliberate, documented a11y fixes in place (credential-card contrast,
radiogroup labeling, `CountUp` sr-only value, `focus-visible` via shadcn
defaults), and no raw `<img>` tags without `next/image`/alt-text handling
exist anywhere in `src/`. This is a good foundation to build a redesign on
rather than a source of new work — see §6 for what a redesign needs to
re-verify.

---

## 6. Design-system terrain (read this before any Liquid Glass work)

Good news: **the design system is unusually centralized already**, which
makes a cohesive visual redesign far cheaper than it would be in a typical
codebase this size.

- **One file controls every color, radius, and type size**:
  `src/app/globals.css` (385 lines), using Tailwind v4's `@theme inline`
  block and OKLCH color space. There is no separate `tailwind.config.js` —
  Tailwind v4's CSS-first config means exactly one file needs to change for
  a global visual-language shift.
- **No leakage outside the token system.** Every raw hex color in the repo
  (7 total) is in a place that legitimately needs one: React-Email templates
  (must inline styles for email clients), `opengraph-image.tsx` files
  (Satori doesn't read CSS custom properties), and one static brand mark.
  Every actual UI surface uses tokens.
- **Visual primitives live in `src/components/ui/`** — 18 shadcn/radix
  components (button, card, dialog, input, select, tabs, dropdown-menu,
  etc.) — plus `src/components/site/` (header, footer, shell),
  `src/components/admin/`, `src/components/dashboard/`, and
  `src/components/motion/`. A redesign's blast radius is contained to these
  ~18 primitive files plus `globals.css`: changing card/button/dialog
  surfaces to a glass treatment there propagates everywhere by construction.
- **A radius ramp already exists** (`--radius-sm` through `--radius-4xl`,
  derived from one `--radius` variable) — directly reusable for glass-panel
  corner treatments.
- **Two constraints a glass redesign must respect, both hard-won:**
  1. README §19.16 — product-critical content (the dashboard course list)
     must not depend on the motion/JS bundle. Any blur/glass effect there
     needs to degrade gracefully via CSS alone, never JS-gated.
  2. The credential card and certificate-adjacent UI have hard-won AA-contrast
     fixes already in place (`DECISIONS.md`). Any translucent or blurred
     surface introduced near them must be re-verified for contrast — glass
     effects are a classic way to reintroduce exactly this kind of failure.

---

## 7. UX friction points

- **Only 2 of 48 route-level `page.tsx` files have a `loading.tsx`, and only
  one `error.tsx` exists in the whole app** (a single root-level boundary),
  plus one `not-found.tsx`. `src/app/dashboard/loading.tsx` is the only
  route-specific loading state anywhere. Outside `/dashboard`'s top-level
  state, every other route — `/admin`'s data-heavy tables, the public
  certifications catalogue, talent profiles, blog, `/verify` — falls back to
  Next's default (a blank frame) instead of a deliberate skeleton, and any
  thrown error outside the root boundary has no route-appropriate recovery
  UI. **Medium severity, broad scope** — this is one of the biggest concrete
  UX wins available and is a natural companion to a UI redesign, since
  skeleton states are themselves a design-system component.
- **Empty states are unverified.** Admin lists (`/admin/leads`,
  `/admin/enquiries`, `/admin/data-requests`) and the public `/talent` and
  `/employers` directories weren't individually checked for a "nothing here
  yet" state versus rendering an empty table/grid. Worth a manual pass.

---

## 8. Summary table

| Area | Critical | High | Medium | Low |
|---|---|---|---|---|
| Security | 2 (ops, not code) | 1 (CSP) | 1 (bucket limits) | 2 |
| Code quality | — | — | — | — (clean; 2 items already tracked) |
| Testing | — | 1 (credential issuance) | — | 2 |
| Performance | — | — | 1 (pagination) | — |
| Accessibility | — | — | — | — (clean) |
| UX | — | — | 1 (loading/error states) | 1 (empty states) |

Design-system readiness (§6) isn't a defect list — it's the map a Liquid
Glass redesign needs before touching anything.

---

## 9. Suggested next steps

Each of these is independent enough to deserve its own scoped design and
approval before implementation, per how this project works
(`brainstorming` → design → `writing-plans` → build):

1. **Security hardening pass** — §0, §1. Cheapest and most urgent; mostly
   independent of the other two.
2. **Liquid Glass UI redesign** — scoped by §6's terrain map: `globals.css`
   plus the ~18 files in `src/components/ui/`.
3. **UX pass** — loading/error boundaries (§7) pairs naturally with #2 since
   skeletons are a design-system concern, but the two can ship separately.
4. Testing and performance items (§3, §4) are lower urgency and can be
   folded into whichever of the above touches the same files, rather than
   run as a separate project.
