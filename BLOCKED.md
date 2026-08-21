# BLOCKED

Items needing an action only the human can take. Nothing here blocks the code
— every one of these is an account, a credential, or a business decision. See
README §22 for the engineering work that is still outstanding.

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

## 5. About-page brand wording (unchanged)
GN Academy vs MAZAL/GN Club relationship — business decision; About page stays
generic until decided.

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
