# GN Academy: what is needed next, and the steps

Companion to `README-SESSION-2026-10-02.md`, which records what was built.
This file is the checklist for what is left. Work top to bottom: later steps depend on earlier ones.

Nothing from the 2026-10-02 session is committed or pushed yet. The live site does not
have the new code. The database already has migrations 0014, 0015 and 0016.

---

## A. Decisions only the owner can make

### A1. Commit and push

Do this when you have looked at the pages in section C. Say whether you want one commit
or several. A sensible split:

1. `feat: free certificate anchoring (merkle + OpenTimestamps)`
2. `feat: LinkedIn add-to-profile redirect and share dialog`
3. `feat: 3D certificate view, pixel background, sign-up button`
4. `feat: Josefin Sans, Manrope and Poppins type system`
5. `docs: session readmes`

Before pushing, confirm `.env.local` is not staged:
`git check-ignore .env.local` must print the file name, and `git status` must not list it.
Pushing to `main` deploys to production on Vercel.

### A2. Migrations 0012 and 0013 (DONE, applied on 2026-10-03)

- **0012** sets size and type limits on the avatars and portfolio storage buckets. Applied.
- **0013** deletes the CAVA auto-scored exam and its 10 questions, adds three chapter
  quizzes and a reviewed final assignment, and flips CAVA to `requires_assignment`.
  This changes how that course issues certificates.
  Applied after checking: the exam had 0 attempts (nothing lost to the cascade) and 10
  questions, which were backed up first (`backup-cava-exam-0013.json` in the session
  scratchpad). Result: 3 chapter quizzes with 11 questions, `requires_assignment = true`.
  The 2 CAVA credentials are untouched. To undo you would have to restore the old exam from
  the backup file and set `requires_assignment` back to false; ask the assistant.

### A3. Is the credential data real?

The database holds **51 credentials**: 48 non-demo and 3 demo records. The docs say no
real cohort has run yet. Check what the 48 are (admin credentials page, or ask the
assistant to list them read-only) before running the backfill in step B4.

---

## B. Setting up the blockchain anchoring (after the code is deployed)

The daily batch route does not exist on the live site until you push (A1).

### B1. Create the secret

In PowerShell:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-character result somewhere safe. Do not paste it into chat or commit it.

### B2. Add it to Vercel

1. vercel.com, open the `gn-academy` project.
2. Settings, Environment Variables.
3. Name `ANCHOR_CRON_SECRET`, value the secret, environment Production.
4. Save, then redeploy (Deployments, the latest one, Redeploy) so it takes effect.

### B3. Add two GitHub secrets

1. GitHub, the `GN-Academy` repository, Settings, Secrets and variables, Actions.
2. New repository secret `ANCHOR_CRON_SECRET`, the same value as in Vercel.
3. New repository secret `ANCHOR_SITE_URL`, `https://www.gnacademy.institute`
   (no trailing slash).

### B4. Anchor the existing credentials

1. Dry run first (read only): `npx tsx scripts/anchor-backfill.ts`
   Last result: scanned 51, assign 48, skip demo 3, failed 0.
2. When you are happy with A3: `npx tsx scripts/anchor-backfill.ts --apply`
   This marks them `pending`, so the next batch timestamps them.

### B5. Run the first batch and check it

1. GitHub, Actions, "anchor-batch", Run workflow. A green run means the secret works.
2. Open a credential's `/verify/<code>`: it should show "Timestamped, Bitcoin
   confirmation pending". Bitcoin confirmation takes hours, so check again later; the
   daily workflow upgrades it.
3. If the workflow goes red later, a batch has been stuck "submitted" for over 7 days.
4. **Verify one real proof end to end** (not yet done, and important):
   download `GET /api/credentials/<code>/proof`, save the `.ots` data, install the
   OpenTimestamps client (`pip install opentimestamps-client`) and run
   `ots info file.ots` and `ots verify -d <merkle root> file.ots`.
   If this fails, the `.ots` serialization in `src/lib/anchor/ots-format.ts` needs fixing.
5. Confirm the third calendar address in `DEFAULT_CALENDARS` (`src/lib/anchor/ots.ts`,
   `finney.calendar.eternitywall.com`). It was written from memory.

---

## C. Look at it in a browser (nothing below has been seen yet except the home page)

Start the app: `cd "C:\GN Ventures\GN Academy"` then `npm run dev -- -p 3003`
(the port must match `NEXT_PUBLIC_SITE_URL`). A dev server from this session may
still be running on 3003.

Check, at a phone width (about 360 px) and a desktop width, in dark and light theme:

| Page | Look for |
|---|---|
| `/` | Josefin caps headline fits on 360 px; lime button; pixel background visible but text readable |
| `/verify/CAVA-2026-000001` | 3D certificate appears by itself, details list under it, drag turns it, Josefin name and title; proof panel (demo records show none) |
| `/dashboard/credentials` (signed in) | 3D certificate, "Add to LinkedIn profile" button, "Public page" and PDF buttons |
| `/certifications/<slug>` | new lime button |
| a lesson page and the blog | body is Manrope, sub-headings sentence case |
| download a certificate PDF | QR code present, layout intact |

Specific known doubts: 3D certificate looks washed out in light mode; text contrast over
the moving background; pixel canvas cost on a mid-range phone (run Lighthouse mobile,
compare LCP and total JavaScript with the earlier version).

LinkedIn check (needs a real credential you own): signed in, click "Add to LinkedIn
profile" and confirm LinkedIn opens a prefilled "Add license or certification" form with
the course name, "GN Academy", the credential code, and a link back to `/verify/<code>`.

---

## D. Optional, when you are ready

### D1. LinkedIn Company Page

Without it, certificates added to a profile show the plain text "GN Academy" with no logo.
1. linkedin.com/company/setup/new, create the GN Academy page, add the logo.
2. Open the page's admin view; the numeric company ID is in the URL.
3. Set `NEXT_PUBLIC_LINKEDIN_ORG_ID` in Vercel (and `.env.local`), redeploy.
   The code then sends `organizationId` instead of the name.

### D2. ThreeUI Pro

Only if you want the original ThreeUI sign-up button and 3D paper instead of our own
builds. It is paid. Steps: buy Pro, run
`npx @designcodeio/threeui-cli login`, then `add <component-id>` in a normal terminal
(not inside Claude Code, the sign-in times out there), and tell the assistant.

### D3. On-chain revocation and instant confirmation

Publish each daily Merkle root as an Ethereum Attestation Service attestation on Base
as well. Costs a few cents per day and needs a small funded wallet, so it is not free-tier.

### D4. Small fixes the assistant can do on request

- Fix 3D certificate contrast in light mode.
- Restyle the "Enroll" submit button in `enroll-form.tsx` to match the new button.
- Keep the background mounted across excluded routes so it never restarts; read
  reduced-motion live.
- Make `src/app/admin/data-requests/actions.ts` mention anchor salts in its deletion note.
- Fix the double `credential.issued` audit log in `src/app/admin/assignments/actions.ts:97`.
- Run `npm audit` and address the 22 pre-existing findings.
- Update `HANDOFF.md`, `PROGRESS.md` and the workspace `PLAN-OVERVIEW.md` session log
  with this session (not done; the new readmes are separate files).

---

## E. Quick reference

| Thing | Where |
|---|---|
| What was built | `README-SESSION-2026-10-02.md` |
| Approved plan | `C:\Users\THEODORE VON JOSHUA\.claude\plans\ticklish-bubbling-brooks.md` |
| Migrations applied this session | 0014, 0015, 0016 |
| Migrations applied this session | 0012, 0013, 0014, 0015, 0016 (all of 0001 to 0016 are live) |
| Test command | `npx vitest run` (305 passing at last run) |
| Backfill | `npx tsx scripts/anchor-backfill.ts [--apply]` |
| Batch route | `POST /api/internal/anchor-batch` (Bearer `ANCHOR_CRON_SECRET`) |
| Proof route | `GET /api/credentials/<code>/proof` |
| LinkedIn redirect | `/credentials/<code>/add-to-linkedin` |

## F. If something goes wrong

- **Whole site errors on start after setting env vars:** check `.env.local` and Vercel
  variables for typos; a blank `ANCHOR_CRON_SECRET` is now safe, a short one is ignored.
- **Cron route returns 401:** the Vercel and GitHub secrets differ, or Vercel was not redeployed.
- **Cron route returns 502:** a step failed or a batch is stuck; see the Vercel function
  logs (details are logged server side only).
- **Sign-in says "Request rejected":** `NEXT_PUBLIC_SITE_URL` does not match the dev port.
- **A page looks wrong after fonts:** add the `heading-plain` class to headings that must
  stay sentence case.
- **To undo the public-read lockdown (0015)** you would have to restore the dropped
  policy; ask the assistant rather than editing by hand.
