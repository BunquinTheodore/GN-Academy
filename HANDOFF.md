# GN Academy — Session Handoff

**Written:** 18 August 2026 · **Read this first, then `PROGRESS.md`, `DECISIONS.md`, `BLOCKED.md`.**

GN Academy is a certification + talent platform for Filipinos entering the
AI-powered workforce. Product loop: free **AI Readiness Test** → email capture
→ free course → paid certification → **publicly verifiable credential** →
talent marketplace. Master spec lives in the original build prompt (§-references
below point at it); the operating rules are: free tiers only, Firebase Auth +
Supabase Postgres (never Supabase Auth), RLS on everything, mobile-first from
360px, `npm run verify` green before "done", never fabricate social proof.

---

## 1. Current state — what exists and works

### Infrastructure (all LIVE and verified against real services)
| Piece | State |
|---|---|
| Repo | https://github.com/BunquinTheodore/GN-Academy.git — branches `main` (phases 1+2 merged), `phase-3-certification` (complete, unmerged — see §4), `phase-1-foundation`, `phase-2-funnel` |
| Supabase | Project `awtwnijgsmxphdnjtehp` (ap-northeast-1). Migrations 0001–0003 + seed applied. Third-Party Auth (Firebase) ENABLED |
| Firebase | Project `gn-academy`. Email/Password + Google enabled. Admin SDK verified working |
| Resend | Key live; domain NOT verified → mail delivers only to owner's address, sender is `onboarding@resend.dev` |
| `.env.local` | All real keys present incl. `SUPABASE_DB_URL` (session pooler). Gitignored — if lost, see `.env.example` and BLOCKED.md history |
| GitHub CLI | Installed at `C:\Program Files\GitHub CLI\gh.exe` (not on PATH), **not yet authenticated** |
| MCP | `.mcp.json` has the Supabase MCP server; user authenticated it, but tools only attach on a fresh session — prefer `scripts/apply-migrations.ts` anyway |

### Phase 1 — Foundation ✅ (merged to main)
Next.js 15.5 (webpack prod build — turbopack build breaks `next start`), TS strict,
Tailwind v4 + shadcn (radix/nova), design tokens (ink `#101B2E` / paper / gold
`#C08A2E` reserved for verified states / signal blue), Bricolage display +
Geist + mono-for-machine-data. Firebase↔Supabase auth bridge:
`POST /api/auth/sync` sets the `role: authenticated` custom claim (free-tier
substitute for Blaze blocking functions) + upserts `profiles`; client
force-refreshes token; `POST /api/auth/session` mints a 5-day httpOnly Firebase
session cookie; middleware does optimistic redirects + CSP/HSTS headers; layouts
re-verify with firebase-admin. `CredentialCard` component in 4 states
(locked/goal/earned/verified) — the signature element. Auth pages, dashboard +
admin shells, marketing/legal pages (privacy/terms are DRAFTS pending legal),
keep-alive + backup workflows (inert until repo secrets exist), `make-admin`
script.

### Phase 2 — Funnel ✅ (merged to main)
Migration 0002 (assessments/questions/attempts/leads — questions have NO select
policy so correct answers never leave the server). 15 seeded AI Readiness
questions (§8 calibration: casual user lands Developing 40–69; weights
prompting 25 / tools 20 / workflow 35 / judgment 20). Anonymous attempts via
`gn_anon` cookie; quiz with localStorage + server persistence and working
browser-back; **email gate only after the final question** (skippable via quiet
link); server-side scoring; shareable results page with dynamic OG image and
locked CredentialCard; leads capture; welcome email; Postgres rate limiting
(attempts 5/IP/h, email 3/IP/h, auth 10/IP/15m, verify 30/IP/h — salted IP
hashes only); anonymous attempts link to account on signup.

### Phase 3 — Certification ✅ built + e2e-verified, ⏳ NOT merged (see §4)
Migration 0003: certifications/modules/lessons (lesson content readable only
via enrollment or `is_preview`), enrollments, lesson_progress, credentials
(public read — verification is the product), `next_credential_code(prefix)` —
atomic `{PREFIX}-{YEAR}-{SEQ}` behind a row lock. Seeded: **Certified AI
Virtual Assistant** (₱1,499, prefix CAVA, 9 real lessons) + **free AI
Foundations** (prefix AIF, 5 lessons), two knowledge exams (10 + 8 scenario
questions, pass 70, max 3 attempts), 3 demo credentials with "(Demo Record)"
holders + on-page demo banner. Pages: catalogue + product (`Course` JSON-LD,
ISR 300s), enroll (paid → pending w/ GCash/Maya reference; free → instant),
`/admin/enrollments` approve/reject queue (audit-logged), course player
(MDX via next-mdx-remote), exam player, credential issuance on pass (+ email),
`/dashboard/{courses,assessments,credentials}`, `/verify` + `/verify/[code]`
(public, JSON-LD `EducationalOccupationalCredential`, revoked + not-found
states), on-demand PDF certificates (pdf-lib — deliberately not stored;
regenerates from live record so revocation is always reflected).

### Verification status
- `npm run verify` (typecheck+lint+16 unit tests+build): **green**
- Playwright: **36/36 live tests pass** (mobile Pixel 7 + desktop) — auth flow,
  full funnel with DB-verified lead row, RLS security proofs (anon cannot read
  profiles/attempts/questions/leads), full certification journey (signup →
  free enroll → all lessons → pass exam → credential issued → logged-out
  stranger verifies publicly), paid pending→active
- Lighthouse mobile: `/` 94-95+100 · `/ai-test` 93+100 · quiz 92+100 ·
  results 95+100 · `/verify/[code]` 93-94+100 · catalogue+product **see §4**
- Real bugs found & fixed by tests: radix-ui barrel shipping 78 kB to every
  page; holder name falling back to email; US date format; two AA contrast
  failures; next-lesson skip bug

---

## 2. How to run everything

```
npm run dev                 # dev server
npm run verify              # the definition of "done"
npm run test:e2e            # public tests only (live ones skip)
$env:E2E_AUTH="1"; npm run test:e2e     # all 36 live tests (PowerShell)
npx tsx scripts/apply-migrations.ts --seed   # idempotent; tracks schema_migrations
npm run make-admin -- someone@email.com      # after they've signed up once
```

Gated e2e specs wipe `rate_limits` in `beforeEach` (one shared IP locally —
the limiter otherwise correctly blocks the suite). Lighthouse recipe used:
build + `npm run start`, warm the route twice, `CHROME_PATH` → Playwright's
Chrome, `npx lighthouse <url> --only-categories=performance,accessibility
--chrome-flags="--headless=new"`.

---

## 3. Sharp edges the next session must know

1. **Never "fix" the auth oddities.** `user_id` columns are `text` (Firebase
   UIDs), RLS compares `auth.jwt() ->> 'sub'`, and the sync route must keep
   setting `role: authenticated`. Disabling RLS to debug = forbidden.
2. **`SUPABASE_SERVICE_ROLE_KEY` holds an `sb_secret_…` key** (modern
   equivalent; verified: bypasses RLS from Node, refused from browsers). The
   user's pasted "service role" JWT was actually the anon key — don't swap it in.
3. **Build with webpack** (`next build`, no `--turbopack`) — turbopack builds
   break `next start` on 15.5.
4. **`radix-ui` stays in `optimizePackageImports`** (next.config.ts) or every
   page regains ~78 kB.
5. **Seed is idempotent by guard** — question INSERTs run only when the
   assessment has zero questions (so /admin edits survive); fixed UUIDs
   elsewhere. Never edit applied migrations; add 0004+.
6. **PowerShell mangles Unicode in files.** Do NOT round-trip file content
   through `Get-Content`/`Set-Content` (it mojibake'd em-dashes and once
   truncated three spec files — recovered via git + rewrite). Use the Edit/Write
   tools or Node scripts for file surgery.
7. Orphaned `node` dev servers accumulate across Playwright runs on Windows and
   poison Lighthouse numbers — check `Get-Process node` before measuring.
8. Commit style: conventional commits, **one commit per feature, pushed
   individually** (user's explicit request — they want reviewable incremental
   history; timestamps stay real, no backdating).
9. Email sender degrades gracefully: placeholder key → skip+log; validation
   errors (unverified domain) → log, never block the user flow.

---

## 4. Immediate next actions (start of next session)

1. **Re-run Lighthouse on `/certifications` and `/certifications/certified-ai-virtual-assistant`**
   on a fresh/quiet machine (ideally post-reboot). They measured 81–88 while the
   identical-weight homepage control (previously 94-95) simultaneously measured
   81 — i.e., environmental noise, not a regression. If ≥90: **merge
   `phase-3-certification` → main** (`git merge --no-ff`) and push. If genuinely
   <90, the levers already identified: both pages are 107 kB static/ISR; look at
   font preloading and TBT, not the DB.
2. **If the user has run `gh auth login`**: set repo secrets —
   ```
   & "C:\Program Files\GitHub CLI\gh.exe" secret set NEXT_PUBLIC_SUPABASE_URL --body "<from .env.local>"
   & "C:\Program Files\GitHub CLI\gh.exe" secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "<from .env.local>"
   & "C:\Program Files\GitHub CLI\gh.exe" secret set SUPABASE_DB_URL --body "<from .env.local>"
   ```
   then `workflow_dispatch` both workflows once to confirm they run.
3. **If the user provided GCash/Maya numbers**: put them in the enroll page
   copy (`src/app/certifications/[slug]/enroll/page.tsx`, marked TODO(blocked))
   — move the payment details into `src/content/` while at it.
4. **If the user gave their signup email**: `npm run make-admin -- <email>`.

## 5. Phase 4 — Admin and content (next build phase, spec §17)

Gate: *a non-developer publishes a new certification and a blog post with no
deploy.* Planned scope:
- `/admin` CRUD: certifications, modules, lessons, **questions** (the §8
  promise that the user edits test questions without a deploy), credential
  revocation (with `audit_log` + reason → shows on /verify)
- Leads table view + **CSV export** (no marketing sender — Resend is
  transactional-only)
- Enrollment-approved email (only credential-issued exists today)
- MDX blog (`next-mdx-remote`, content in-repo) with categories, `Article` JSON-LD
- `sitemap.ts`, `robots.ts`, `Organization` JSON-LD sitewide, OG images for
  certifications
- Wire analytics: `src/lib/analytics.ts` is a typed no-op stub with all §13
  event names already called at the right places; pick a cookieless provider
  (no consent banner) and keep the vendor import inside that one file
- `/data-request` form → admin queue + real account deletion (profile,
  attempts, portfolio, storage; credentials retained but unlinked — §14)
- Funnel metrics dashboard in /admin (targets: start→complete 60%+,
  complete→email 40%+)

## 6. Phase 5 — Talent layer (after Phase 4)

Public profiles `/talent/[username]` (only with verified credential +
`is_public`), portfolio uploads (browser-image-compression → WebP → Supabase
Storage buckets per §9 — **buckets not created yet**), employer directory with
filters, enquiry form, `/companies`. Storage policies restrict writes to
`(storage.foldername(name))[1] = auth.jwt() ->> 'sub'`.

---

## 7. Things only the USER can do (standing list)

| # | Action | Status / blocks |
|---|---|---|
| 1 | `! & "C:\Program Files\GitHub CLI\gh.exe" auth login` (browser flow) | Blocks repo secrets → keep-alive + DB backups |
| 2 | Provide real GCash/Maya receiving name + number | Blocks anyone actually paying |
| 3 | Sign up on the site, then tell the session the email for make-admin | Blocks using /admin queue |
| 4 | Verify sending domain in Resend (SPF + DKIM DNS records) | Until then, email reaches only the owner's inbox |
| 5 | Legal review of /privacy and /terms drafts; NPC registration decision | Compliance (RA 10173) |
| 6 | Decide GN Academy ↔ MAZAL / GN Club brand relationship | About page + footer stay generic |
| 7 | Decide production hosting + domain (spec assumes Vercel Hobby is dev-only — commercial use prohibited) | Blocks launch; app is deployment-agnostic by design |
| 8 | (Later, Phase 5) Create Storage buckets per §9 in Supabase dashboard | Blocks avatars/portfolio |

## 8. File map (what was created/edited, by area)

- **State/docs:** `PROGRESS.md`, `DECISIONS.md` (every judgement call),
  `BLOCKED.md`, `README.md`, this file
- **Config:** `next.config.ts` (optimizePackageImports), `middleware.ts`
  (security headers + optimistic auth), `vitest.config.ts`,
  `playwright.config.ts` (mobile-first projects), `.env.example`, `.mcp.json`,
  `.github/workflows/{keep-alive,backup}.yml`
- **DB:** `supabase/migrations/0001..0003`, `supabase/seed.sql`,
  `scripts/apply-migrations.ts`, `scripts/make-admin.ts`
- **Auth:** `src/lib/firebase/{client,admin}.ts`, `src/lib/supabase/{client,server}.ts`,
  `src/lib/auth/{client,session,schemas,anon}.ts`, `src/app/api/auth/{sync,session}/`
- **DAL (all queries live here, §5):** `src/lib/db/{profiles,assessments,attempts,
  leads,certifications,enrollments,progress,credentials,exams}.ts`
- **Engine:** `src/lib/assessment/{scoring,ownership}.ts`, `src/lib/rate-limit.ts`,
  `src/lib/{analytics,format}.ts`, `src/lib/email/{send,welcome,credential-issued}`
- **Routes:** homepage, marketing pages (copy in `src/content/site.ts` +
  `ai-test.ts` — never hardcoded), `(auth)` pages, `ai-test/{quiz,results}`,
  `certifications` + `[slug]` + `enroll`, `dashboard/{courses,learn,assessments,
  credentials,profile}`, `admin/enrollments`, `verify/[code]`,
  `api/{attempts,exams,credentials}`
- **Components:** `credential-card.tsx` (the signature element),
  `site/{header,footer,page-shell}`, `google-mark`, `sign-out-button`, shadcn ui/
- **Tests:** `tests/unit/{auth-schemas,scoring}.test.ts`,
  `tests/e2e/{public-pages,auth-flow,funnel-flow,rls-security,certification-flow}.spec.ts`

## 9. Session-start ritual (unchanged from the spec)

1. Read `HANDOFF.md` → `PROGRESS.md` → `DECISIONS.md` → `BLOCKED.md`
2. State the phase and next three tasks
3. `npm run verify` — fix anything broken before adding features
4. Work; commit per feature; push each; update state files as you go
