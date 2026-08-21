# GN Academy — Session Handoff

**Written:** 21 August 2026

`README.md` is now the complete reference for this codebase — stack, setup,
env vars, auth model, database schema, route map, security, testing, launch
checklist, and the "don't fix this" list. Read it first. This file is only
what a person picking the work up needs that the README does not say: what
happened last, and what to do next.

Also: `PROGRESS.md` (phase-by-phase resume point), `DECISIONS.md` (every
judgement call), `BLOCKED.md` (things only a human can do).

---

## 1. Where things stand

Phases 1–4 are merged to `main`. Phase 5 (the talent layer) is committed on
`phase-5-talent` and **not merged**. Phase 6 — everything this session did —
is **uncommitted in the working tree**.

The product works end to end: free AI Readiness Test → email capture → free
course → paid certification → publicly verifiable credential → talent profile
→ employer enquiry, with a full admin area behind it. Nothing on the launch
checklist (README §18) is blocked on code.

`README.md` §21 is the detailed account of this session and §22 is the ordered
list of what to do next. Start there.

**Do not discard the working tree.** Migration 0006 has already been applied
to the live database and is recorded in `schema_migrations`, but the file is
uncommitted — lose it and the live schema carries a change the repo has no
record of. Everything else from this session lives only in the working tree
too. Commit first, then do anything risky.

---

## 2. What this session did

### It found the bug the talent test had been reporting all along

The talent e2e had been failing on a profile save that sat on "Saving…" until
the budget ran out. The previous session read that as load — parallel workers
competing for a cold server-action module — and it was not. Running the spec
alone with one worker still failed, so it was measured properly:

- The server finishes everything. The action completed in ~850 ms, the page
  re-render right behind it in ~500 ms, in *every* run including the failing
  ones.
- The browser never commits the transition. The action POST returns 200 with
  `text/x-component` and the button stays disabled forever.
- Removing every `revalidatePath` call from the action: 4/4 pass. Putting a
  single one back, against an unrelated fully dynamic route: 2/3 fail.
- `next dev` never reproduces it.

**Any server action that calls `revalidatePath` and returns state to
`useActionState` hangs the client in a production build.** Every admin editor
did exactly that, so *the whole admin area was broken in production* — and the
suite never noticed, because no test had ever submitted an admin form. They
only read admin pages and asserted 404s.

The fix: no server action calls `revalidatePath` any more. Calls that pointed
at fully dynamic routes were no-ops and were deleted; the ones that mattered
are returned as `AdminFormState.revalidate` and purged by `AdminForm` through
`POST /api/revalidate` after the save has already succeeded. Create and delete
actions return `redirectTo` instead of calling `redirect()`, which is the same
workaround the lesson player already used. There is now an e2e test in which
an admin writes, publishes, and edits a post through the real UI and a
logged-out stranger reads it immediately.

### It audited the rest of the codebase and fixed what it found

Nine more real defects, each verified against the code before being touched.
The list is in `PROGRESS.md` under Phase 6; the ones worth knowing about:

- A **rejected paid enrollment could never be re-submitted**. The retry path
  existed on purpose, but `createEnrollment` was a plain insert against a
  unique constraint, so a mistyped payment reference locked a paying customer
  out permanently behind "try again", forever.
- Ticking "list me in the employer directory" without a credential **threw the
  whole profile edit away** while the message said it had been saved.
- Two concurrent submissions of one exam attempt could **both issue a
  credential**. `completeAttempt` is now the claim on the attempt.
- `POST /api/attempts` accepted **any** published assessment slug, including
  paid certification exams, skipping the enrollment and attempt-limit checks.
- Account erasure left the person's **avatar and portfolio images public** at
  stable URLs.
- Migration 0006 drops the two RLS policies that let a signed-in browser write
  directly to `profiles` and `attempts`. The app has never used them, and they
  bypassed every server-side validation.

### It made the last two "needs a developer" items configuration

GCash/Maya receiving details are `NEXT_PUBLIC_PAYMENT_*`; the email sender is
`RESEND_FROM`. Both degrade honestly when unset.

### And it chased the same bug to the bottom

The free certification journey kept failing at a lesson-to-lesson navigation.
`router.refresh()` immediately after `router.push()` was part of it and was
removed. That still left the journey failing under load — and at two workers
as well as three, so it was not queueing.

The real answer is more general than either earlier fix: **an action's
response carries a re-render of the current route, and that stream stalls
under concurrency even when the action's own work has finished.** Lesson
completion now goes through `POST /api/lessons/[lessonId]/complete`, a route
handler that answers with JSON and nothing else.

**64 of 64, no flakes** — and the suite went from 5.1 minutes to 2.2, which is
the same finding seen from the other side.

The rule to carry forward: when a mutation exists to do work and then send the
user somewhere, rather than to update the page in place, use a route handler
and navigate from the client.

---

## 3. Next actions

See README §22 for the full ordered list. In short: re-run the suite, commit
and push the six changes, merge `phase-5-talent`, then:

1. **Re-measure Lighthouse on a quiet machine** across the public routes,
   including `/employers`, `/talent/[username]`, and `/companies`. Everything
   measured in earlier sessions was about ten points below its known-quiet
   value, control included, so the absolute numbers are still unconfirmed.
   Use the paired-control method in `DECISIONS.md`.
2. **`npm audit`** reports 9 vulnerabilities (3 high), all in the build
   toolchain reached through `next` (postcss, sharp) and through
   `firebase-admin` (uuid). None is runtime attack surface for this app —
   `next/image` is never used, so sharp never runs. `npm audit fix --force`
   would move Next to 16 and *downgrade* firebase-admin; npm `overrides`
   pinning `postcss@^8.5.26`, `sharp@^0.35.3`, and `uuid@^11.1.1` is the
   non-breaking route. Verify and run the auth e2e afterwards — the uuid
   override sits under firebase-admin.
3. **Work the launch checklist** in README §18. Items 2, 4, 7 and 8 are the
   ones that actually gate taking money.

---

## 4. Session-start ritual

1. Read `README.md`, then this file, then `PROGRESS.md` → `BLOCKED.md`.
2. State the next three tasks.
3. `npm run verify` — fix anything broken before adding features.
4. Work; commit per feature; push each; update the state files as you go.

And the rule this session earned twice: **measure before you fix.** A red e2e
has been the environment three times and a genuine production bug twice, and
the two look identical from the failure message.
