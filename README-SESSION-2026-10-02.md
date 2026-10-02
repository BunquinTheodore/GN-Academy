# GN Academy: certificates, LinkedIn, 3D, background and fonts (session of 2026-10-02)

This file records everything built in one working session, what state it is in,
what has and has not been verified, and what still has to be done by a person.
The project's own `README.md`, `HANDOFF.md` and `PROGRESS.md` are unchanged.

**Status: all code is written and tested but NOTHING IS COMMITTED OR PUSHED.**
The user asked to hold off on commit and push. The live site does not have any of
this code yet. The database does have three new migrations (see section 7).

---

## 1. Goals

1. Anchor issued certificates to a public blockchain so they can be checked
   without trusting GN Academy's own database. **Constraint: free tier only.**
2. Make "Add to LinkedIn profile" (Licenses and certifications) a first-class
   share option next to "Post to feed", reached by a redirect.
3. Use ThreeUI components: a sign-up button, a pixel-arc page background, and a
   3D paper view for certificates.
4. A new site-wide font system: Josefin Sans Light (all caps) for titles and main
   sections, Manrope for body text, Poppins for UI text.
5. The 3D certificate is not optional: it shows by default, with the details beside it.

## 2. Summary of what was done

| Area | Result | Visually checked in a browser? |
|---|---|---|
| Free blockchain anchoring (Part A) | Built, unit tested, migrations applied | Verify page loads (HTTP 200). Anchor panel states not viewed. |
| LinkedIn add-to-profile (Part B) | Built, unit tested | No |
| Sign-up button (Part C) | Own build (ThreeUI's is Pro), used on homepage hero and certification page | Home page yes, looks as intended |
| Pixel-arc background (Part D) | Library component, mounted once in the root layout | Yes, canvas runs on home and verify pages |
| 3D certificate (Part E) | Own three.js build, now shown by default | Yes before the "default view" change; the default-view change and the Josefin face were tests only |
| Fonts | Applied site-wide | Agent screenshots of the home page only |
| Security and code reviews | Run, findings fixed | n/a |

Test status at last run: **26 test files, 305 tests passing**, `tsc --noEmit` clean.

## 3. Part A: free blockchain anchoring

**Design (chosen because no public mainnet transaction is literally free):** each
certificate gets a salted SHA-256 leaf hash. Once a day the pending hashes are
combined into a Merkle tree, and the single Merkle root is timestamped with
OpenTimestamps, which is free and anchors into Bitcoin. No wallet, no gas, no
paid service. Revocation is not on-chain: it stays in the database and on
`/verify`, which remains the authoritative status.

How it flows:

1. **Issuance** (`src/lib/credentials/issue.ts`): after a credential is inserted,
   `queueAnchor()` generates a random salt and the leaf hash and marks it
   `pending`. It never blocks or fails issuance (wrapped, logs on error).
   Demo records ("(Demo Record)" in the name) are `skipped`.
2. **Daily batch:** a GitHub Actions workflow (`.github/workflows/anchor-batch.yml`)
   calls `POST /api/internal/anchor-batch` with a bearer secret. The route builds
   the Merkle tree, stores each credential's proof, submits the root to the public
   OpenTimestamps calendars, and later upgrades earlier batches once Bitcoin
   confirms. Overlapping runs are safe (the batch is created atomically in SQL).
3. **Verification:** `/verify/[code]` shows a "Blockchain proof" panel (queued,
   timestamped, or "Reported confirmed in Bitcoin block N") and a server-side hash
   and Merkle match indicator. `GET /api/credentials/[code]/proof` returns the
   payload, salt, Merkle proof and `.ots` file so anyone can verify independently.
4. **PDF:** the certificate PDF now carries a QR code to the verify page and a
   short hash line.

Key files:

- `src/lib/anchor/`: `hash.ts`, `merkle.ts`, `ots.ts`, `ots-format.ts`, `run-batch.ts`,
  `assign.ts`, `bundle.ts`, `load.ts`, `cron-auth.ts`, `panel-state.ts`
- `src/lib/db/anchors.ts`, `src/lib/db/anchor-backfill.ts`, `src/lib/pdf/qr.ts`
- `src/components/anchor-proof-panel.tsx`
- `src/app/api/internal/anchor-batch/route.ts`, `src/app/api/credentials/[code]/proof/route.ts`
- `scripts/anchor-backfill.ts` (dry run by default, `--apply` to write)
- Privacy copy added to `src/app/privacy/page.tsx` ("Certificate timestamps")

Leaf hash rules: SHA-256 over key-sorted JSON of
`{v:1, code, holderName (NFC), title, level, issuedAt (ISO UTC), competencies, issuer:"GN Academy"}`
with the salt. Merkle leaves are `SHA-256(0x00 || leaf)`, parents are
`SHA-256(0x01 || left || right)`, and an odd node is promoted unchanged.
For a verifier outside JavaScript: the JSON is serialised like `JSON.stringify`
with non-ASCII characters NOT escaped (in Python use `ensure_ascii=False`).
Verify a downloaded proof with the standard tool: `ots verify -d <root> file.ots`.

Salt and privacy: the salt lives in a separate service-role-only table
(`credential_anchor_secrets`). Deleting an account deletes the salt rows for that
user's credentials, after which the proof can no longer be verified from the site.
The hash on Bitcoin cannot be erased but cannot be linked to a person without the
salt. Anyone who already saved a proof keeps their copy.

## 4. Part B: LinkedIn "Add to profile"

- `src/lib/linkedin/share.ts`: `buildAddToProfileUrl` now supports an expiry date
  and an optional Company Page ID (`organizationId` replaces `organizationName`;
  LinkedIn accepts only one of them). Today it sends `organizationName=GN Academy`.
- New redirect route `GET /credentials/[code]/add-to-linkedin`
  (`src/app/credentials/[code]/add-to-linkedin/route.ts`, logic in
  `src/lib/linkedin/add-to-profile.ts`). Signed-out visitors go to login first;
  only the credential's owner can use it (others get a 404 that does not reveal
  the credential exists); revoked or expired credentials get a 410; otherwise a 302
  to LinkedIn. The redirect base is `NEXT_PUBLIC_SITE_URL`, never the request origin.
- `src/components/linkedin-share-dialog.tsx`: two equal choices, "Post to your feed"
  and "Add to LinkedIn profile".
- A standalone button on dashboard credential cards, and a link in the issued
  credential email (`src/lib/email/credential-issued.tsx`).
- `NEXT_PUBLIC_LINKEDIN_ORG_ID` is optional (`src/lib/env.ts`, `.env.example`).
  GN Academy has **no LinkedIn Company Page yet**, so the plain name is used.
  `BLOCKED.md` has an item to create the page and set the ID.

## 5. Part C, D, E: ThreeUI work

**ThreeUI Pro is not available on the user's account.** The CLI sign-in screen said
"Pro access required". `SignUpButton` and `ThreeDPaper` are not in the public npm
package (`@designcodeio/threeui@1.2.0`), and the public source links were NOT used
to get around the licence. So:

- **Installed:** `@designcodeio/threeui` (pinned to exactly `1.2.0`) and `three`
  (0.186.1). Only `PredictiveArcCanvas` from it is used.
- **Part C, sign-up button:** our own `SignUpCta` (`src/components/sign-up-cta.tsx`,
  CSS at the end of `src/app/globals.css`). Lime glass pill in the house style, with
  the existing `gn-shine` sweep, reduced-motion and reduced-transparency handling.
  Used for the homepage hero (both signed-out and signed-in) and the "Enroll now"
  button on certification pages. **Not changed:** the "Enroll" submit button inside
  `enroll-form.tsx`.
- **Part D, background:** `PredictiveArcCanvas variant="data-pixel"`. It is Canvas 2D
  only, needs no assets, and works with the existing CSP.
  `src/components/site-background.tsx` (lazy, after idle) and
  `site-background-canvas.tsx`, mounted once in `src/app/layout.tsx`. The decision
  logic is in `src/lib/site-background-policy.ts`: hidden on `/dashboard`, `/admin`,
  `/login`, `/signup`, `/forgot-password`, `/api`; a static gradient instead of the
  canvas for reduced motion, Save-Data, or low-end devices.
- **Part E, 3D certificate:** our own three.js build in `src/components/certificate-3d/`
  (a translucent paper you can drag or hover, arrow keys to turn, Escape to reset;
  `touch-action: pan-y` so mobile page scroll is not trapped). The face is drawn to a
  canvas texture from the site's own colours and fonts (Josefin Light caps for the
  name and course title). **It is now the default view** (`certificate-viewer.tsx`):
  it mounts when the certificate is near the screen and sits above a visible details
  list (awarded to, certificate, level, issued, code). The flat card shows only while
  it loads, and on devices with no WebGL or with Data Saver on. Reduced motion stays 3D
  but drops the idle float and inertia. Used on `/verify/[code]` for active credentials
  and on the dashboard credentials page. Revoked or expired credentials show the flat card.
  A blank-frame bug (nothing drawn until the animation loop ran) was fixed by drawing
  once immediately and on every resize.

## 6. Fonts

| Role | Font | Where |
|---|---|---|
| Titles and main sections | Josefin Sans Light (300), all caps via CSS | every h1 and h2, hero, wordmark |
| Body | Manrope (variable) | paragraphs, lessons, h3 and below, card titles |
| UI | Poppins 400, 500, 600 | buttons, nav, labels, inputs, tabs, badges |

Set in `src/app/layout.tsx` (next/font) and `src/app/globals.css` (tokens
`--font-display`, `--font-sans`, `--font-ui`). Add the class `heading-plain` to an h1
or h2 that must stay sentence case. Only Light is shipped for Josefin, so heavier
weights would be synthesised: avoid `font-semibold` on display text. The certificate
PDF and the OG image routes still use their own embedded Inter and Bricolage and were
deliberately left alone. Only the home page was screenshot-checked at 1280 px and 360 px.

## 7. Database

Applied to the live database this session (each in its own transaction, recorded in
`schema_migrations`):

- **0014_credential_anchor.sql:** anchor columns on `credentials`, the secrets table,
  `anchor_batches`, and the atomic `anchor_create_batch` function.
- **0015_credentials_public_view.sql:** replaces the public `select using (true)` policy
  on `credentials` with a column-limited view `credentials_public`. Anonymous users can
  no longer read the table (it exposed the Firebase user ID, revoke reasons and PDF URLs).
  The server uses the service role and is unaffected.
- **0016_anchor_last_checked.sql:** stops a stuck old batch blocking newer ones.

Verified after applying: all 51 existing credentials are `anchor_status = skipped`,
anonymous select on `credentials` is false, on the view true, on the secrets table false,
and `/verify/CAVA-2026-000001` returns 200.

**Also applied, on the user's instruction:** 0012 (image size limits on the avatars and
portfolio buckets) and **0013** (deletes the CAVA auto-scored exam, adds three chapter
quizzes and a reviewed final assignment, and flips CAVA to `requires_assignment`).
Checked first: the exam had 0 attempts (the cascade deleted none), 10 questions, and the
2 existing CAVA credentials are active and untouched. A backup of the deleted exam and
questions is in the session scratchpad (`backup-cava-exam-0013.json`). Verified after:
old exam gone, 3 chapter quizzes with 11 questions, `requires_assignment = true`, both
buckets limited to 2 MB and image/webp. All migrations 0001 to 0016 are now applied.

**Backfill:** `npx tsx scripts/anchor-backfill.ts` dry run found 51 credentials: 48 to
assign, 3 demo records skipped. Not applied. The docs said no real cohort had run, so
check that the 48 are really real credentials before running with `--apply`.

## 8. Environment and secrets (the owner must do these; values are never in this repo)

- `ANCHOR_CRON_SECRET`: 32+ characters. Create one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  Add it in Vercel (Settings, Environment Variables, Production) and as a GitHub
  repository secret with the same name. A blank or too-short value is treated as unset
  (the cron route then answers 401), it no longer crashes the site.
- `ANCHOR_SITE_URL` (GitHub secret): the production origin, e.g.
  `https://www.gnacademy.institute`, no trailing slash.
- `NEXT_PUBLIC_LINKEDIN_ORG_ID`: optional, once a Company Page exists.
- Remember `NEXT_PUBLIC_SITE_URL` must match the dev port (3003) or sign-in is rejected.

The workflow cannot run until the code is deployed (it calls the new route).
After deploying: GitHub, Actions, "anchor-batch", Run workflow. A green run means the
secret is accepted.

## 9. Reviews and what they fixed

A code review and a security review found no CRITICAL issues. Fixed:

- Open redirect after sign-in via tab or newline characters in `next` (`safeNextPath`).
- Public read of every credential's holder ID (migration 0015).
- A blank `ANCHOR_CRON_SECRET=` line crashing the whole server.
- Privacy copy promising salt deletion that the code did not do.
- Calendar fetches: no redirects, https only, capped count and response size.
- Stuck batches starving new ones, and a salt-overwrite race in the backfill.
- Cron route no longer leaks error details; the workflow has `permissions: {}` and
  hardened curl flags; the proof route has its own rate-limit bucket (60 per hour).
- The page badge now says "Reported confirmed in Bitcoin block N"; the downloadable
  proof is the trustless check.
- `@designcodeio/threeui` pinned to an exact version.

## 10. Known issues, unverified items and follow-ups

- **Never run live:** no real OpenTimestamps calendar was ever called. The `.ots`
  byte format was checked against the spec by review but only round-trip tested.
  The third calendar URL (`finney.calendar.eternitywall.com`, in `DEFAULT_CALENDARS`
  in `src/lib/anchor/ots.ts`) is unconfirmed. Before relying on it, take one real
  proof and run `ots verify` and `ots info`.
- **"Confirmed" is calendar-reported:** the code does not itself check the Bitcoin
  block header.
- **Not viewed in a browser:** the anchor proof panel states, the LinkedIn dialog and
  redirect, the dashboard, light mode of anything new, the 3D certificate with its
  details list and Josefin face, mobile widths, and the fonts beyond the home page.
- **3D light mode:** the paper is still pale on a pale frame, but the Josefin Light text
  now gets a hairline stroke so the name, title and code are readable (checked in Chrome on
  2026-10-03, desktop, light theme). A placeholder with the viewer's aspect ratio now holds
  the space while the three.js chunk loads, so the page no longer jumps. Dark mode, phone
  widths and the dashboard are still unchecked.
- **Mobile cost:** the pixel canvas fills every cell each frame and is CPU-heavy on
  mid-range phones; the 3D view is heavy too. Run Lighthouse mobile before release.
- The dev-time hydration warning about the `nonce` on the JSON-LD script predates this work.
- Smaller: the 3D viewer's focus is not returned to a button on exit (the button is gone
  now); the background restarts when returning from an excluded route; reduced motion is
  read once, not live; the lime button's edge is faint in light mode on a white page.
- `src/app/admin/data-requests/actions.ts` still builds its note from the old deletion
  report fields and does not mention salts.
- `src/app/admin/assignments/actions.ts` double-logs `credential.issued` (pre-existing).
- Credential codes are sequential and guessable (pre-existing).
- Vercel Hobby does not allow commercial use (pre-existing).
- 22 `npm audit` findings existed before this work and none come from the new packages.
- Optional upgrades: publish each batch root as an EAS attestation on Base (a few cents
  per day) for on-chain revocation and instant confirmation.

## 11. How to run and check

```
cd "C:\GN Ventures\GN Academy"
npm run dev -- -p 3003     # port must match NEXT_PUBLIC_SITE_URL
npx vitest run             # 305 tests
npx tsc --noEmit
npm run verify             # typecheck, lint, tests, build (stop the dev server first)
```

Do not run `npm run build` while the dev server uses the same `.next` folder.
A dev server on port 3003 may still be running from this session.

Pages to look at: `/` (hero button, background, fonts), `/verify/CAVA-2026-000001`
(3D certificate, details, proof panel), `/dashboard/credentials` (signed in:
3D certificate, LinkedIn buttons), `/certifications/<slug>` (new button).

## 12. Decision log

- Anchoring: hash only, no wallets for students (GN Academy signs nothing on-chain;
  OpenTimestamps needs no key). Free tier is a hard constraint.
- LinkedIn: organization name until a Company Page exists.
- ThreeUI Pro unavailable: build our own button and 3D certificate rather than use
  the public source links.
- Fonts: Josefin Sans Light caps for titles, Manrope body, Poppins UI.
- 3D certificate shows by default, with details beside it; flat card only without
  WebGL or with Data Saver on.
- Commit and push held until the user says so. Migrations 0014 to 0016 applied by the
  assistant at the user's request, followed by 0012 and 0013 once the exam was checked for attempts.

## 13. Work still needing the owner

1. Say when to commit and push (one commit or several).
2. (Done) migrations 0012 and 0013 applied.
3. `ANCHOR_CRON_SECRET` is saved in Vercel (Production). Still to do: the same secret and `ANCHOR_SITE_URL` in GitHub.
4. Review the 48 credentials, then run the backfill with `--apply`.
5. Optionally create a LinkedIn Company Page and share its ID.
6. Look at the pages in section 11 and send corrections.
