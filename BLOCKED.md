# BLOCKED

Items needing an action only the human can take. Nothing here blocks the code
— every one of these is an account, a credential, or a business decision. See
README §22 for the engineering work that is still outstanding.

Resolved 2026-08-21: `gh auth login` done as BunquinTheodore, and the three
repo secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_DB_URL`) are set. Both workflows dispatched and verified: keep-alive
pings the database, and the backup produces a real 80 KB dump — it had never
produced one before today, see README §18.

## 1. Analytics provider account (new, Phase 4)
The funnel events are wired and the loader is in place, but analytics stays
inert until both vars are set in `.env.local` (and in the host's env):
```
NEXT_PUBLIC_ANALYTICS_SRC=https://<provider>/script.js
NEXT_PUBLIC_ANALYTICS_WEBSITE_ID=<id>
```
Needs a cookieless provider so no consent banner is required. Umami Cloud's
free tier is the assumed default; Plausible and Counter.dev share the same
script-tag + `track(name, props)` shape, so any of them drops in. Until then
`/admin` still reports the funnel from the database.

## 2. Resend domain (not urgent)
Until your sending domain verifies (SPF + DKIM), email delivers only to your
own address; sender is onboarding@resend.dev meanwhile.

## 3. GCash/Maya receiving account
The enrollment page prints payment instructions from configuration, so this
no longer needs a code change — set these in `.env.local` and in the host's
environment:
```
NEXT_PUBLIC_PAYMENT_GCASH_NAME=
NEXT_PUBLIC_PAYMENT_GCASH_NUMBER=
NEXT_PUBLIC_PAYMENT_MAYA_NAME=
NEXT_PUBLIC_PAYMENT_MAYA_NUMBER=
```
A channel appears only when both its name and its number are set; with none
set, the page says the account is published with the first cohort. Paid
enrollment already works end to end without them — the learner just has
nowhere to send the money yet.

## 4. Legal review of /privacy and /terms (unchanged)
Drafts are live and marked as drafts. NPC registration decision still yours.

## 5. About-page brand wording (RESOLVED 2026-08-25)
Decided by the client: GN Academy leads on its own name. The GN Ventures
attribution came off the landing hero and now reads "Powered by GN Ventures"
in the footer legal line (`src/content/site.ts`). The About page keeps the
argument that the GN Ventures community is a hiring network, under the heading
"The network behind the credential", but no longer opens on parent-brand
framing. MAZAL / GN Club naming is still unused anywhere in the product.

---
Resolved 2026-08-18: Firebase web config ✓ · Firebase service account ✓
(admin SDK verified against live project) · Supabase URL/anon/secret keys ✓
(REST probe OK) · Third-Party Auth Firebase ENABLED ✓ (screenshot) ·
Email/Password + Google providers ENABLED ✓ · Resend key ✓ · IP_HASH_SALT ✓.
Note: the value pasted as "service role secret" was the anon key again; the
sb_secret_ key is its modern equivalent and is used instead.

Resolved 2026-08-19: Storage buckets `avatars` and `portfolio` created
programmatically with the service role (public-read, size and MIME limited);
write policies restrict each user to their own UID folder. No dashboard step
is needed.
