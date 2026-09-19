# Advocacy content addition — Proof of Work + Speaker Booking

Built on top of the existing GN Academy site without touching the hero,
AI Readiness Test, certification, credential verification (`/verify`) or
course data. Everything below is additive.

## What was built

1. **Proof of Work gallery** on the landing page, directly below the hero,
   above the existing "Why earn a GN Academy certificate?" section. Shows
   Jops speaking at universities (five placeholder talk entries) and the
   Wobex hackathon, each card labelled with school/event name, location and
   date — all marked `TODO` since no real names or dates are confirmed yet.
2. **Speaker Booking page** at `/speaker-booking`: hero copy, two on-stage
   imagery placeholder slots, and an inquiry form (name, organization, event
   type, date, audience size, message).
3. **Speaker booking API route** at `/api/speaker-booking`: validates
   required fields server-side with zod, logs payload metadata only (never
   the free-text message body), and sends a notification email to
   `gnclub.contactus@gmail.com` through the project's existing `sendEmail`
   helper (Resend). That helper already has a safe placeholder fallback, so
   nothing is faked — if the configured Resend key is a placeholder, the
   route still returns success (inquiry received and logged) and the
   response body says email delivery wasn't sent.
4. Light advocacy copy woven into `src/content/site.ts` (`description`,
   footer `blurb`) and `src/content/landing.ts` (`tracks.body`) — additive
   sentences only, no removed or restructured hero/certification copy.
5. Speaker Booking nav link added by adding an entry to `nav.links` in
   `src/content/site.ts` (the header renders nav links data-driven, so no
   direct edit to `header.tsx` was needed — it picks the new link up
   automatically in the exact existing style). Also added to the footer's
   Platform column.
6. Photo placeholder slots (styled, filename + description shown, proper
   accessible name) for all requested filenames — see "Photo slots" below.
7. Premium glass material added to `globals.css` (`.glass-panel`,
   `.glass-panel-strong`) reused by the gallery cards and the speaker
   booking page/form, with a `prefers-reduced-transparency: reduce`
   solid-fill fallback and no new hex colors (uses `--card`, `--border`,
   `--brand` via `color-mix()` in oklch).

## Files created

- `src/content/advocacy.ts` — advocacy content model (proof-of-work items,
  speaker booking copy, form field labels), pattern-matched to
  `src/content/landing.ts`.
- `src/components/advocacy/ProofOfWorkGallery.tsx` — the gallery section
  component, using the existing `Reveal`/`Stagger`/`StaggerItem` motion
  primitives from `src/components/motion/reveal.tsx`.
- `src/app/speaker-booking/page.tsx` — the Speaker Booking page (server
  component).
- `src/app/speaker-booking/speaker-booking-form.tsx` — the inquiry form
  (client component), following the `react-hook-form` + `zodResolver`
  pattern used by `src/app/(auth)/forgot-password/forgot-password-form.tsx`.
- `src/app/api/speaker-booking/route.ts` — POST handler: origin check
  (`isTrustedOrigin`, same helper `/api/revalidate` uses), zod validation,
  metadata-only logging, email notification.
- `src/lib/email/speaker-inquiry.tsx` — the notification email template,
  pattern-matched to `src/lib/email/welcome.tsx` (`@react-email/components`).

## Files changed

- `src/app/page.tsx` — imported and inserted `<ProofOfWorkGallery />`
  directly below the hero `<section>`, before the existing
  "certificateReasons" section. No other section reordered or removed.
- `src/app/globals.css` — added `.glass-panel` / `.glass-panel-strong`
  utilities plus the reduced-transparency fallback.
- `src/content/site.ts` — added the Speaker Booking nav link and footer
  link, and one additive sentence each to `description` and `footer.blurb`.
- `src/content/landing.ts` — one additive sentence appended to
  `tracks.body`. Hero, certificateReasons, stats, problem, offer, ladder
  and finalCta are untouched.

## Patterns reused (not reinvented)

- Content-as-data: `advocacy.ts` mirrors `landing.ts`'s typed-object shape.
- Motion: `Reveal` / `Stagger` / `StaggerItem` from
  `src/components/motion/reveal.tsx`, same as the rest of the landing page.
- Forms: `react-hook-form` + `@hookform/resolvers/zod`, same as the auth
  forms.
- Email: the existing `sendEmail()` helper and `@react-email/components`
  templates already used for welcome/enrollment emails — no new email
  infrastructure introduced.
- API route shape: zod schema, `isTrustedOrigin` origin check, JSON
  responses — same shape as `src/app/api/revalidate/route.ts`.
- Design tokens: only `--brand`, `--brand-cyan`, `--verified`, `--card`,
  `--border`, `--primary` and friends, via `color-mix()` in oklch. No new
  hex values.

## Photo slots needed (all currently placeholders, no files exist yet)

Rendered as styled dashed glass panels showing the filename and a
description, with `role="img"` + `aria-label` carrying the same text
screen readers get once a real `<Image alt="…">` replaces the slot.
Intended location once supplied: `public/proof-of-work/`.

- `school-hero.jpg` — wide hero shot above the gallery grid.
- `school-01.jpg` through `school-10.jpg` — two photos per university-talk
  gallery card (5 cards × 2 photos).
- `wobex-01.jpg` through `wobex-05.jpg` — Wobex hackathon card.
- `speaker-jops-01.jpg`, `speaker-jops-02.jpg` — on-stage imagery on the
  Speaker Booking page.

## Verification run

- `npm run typecheck` — passed, no errors.
- `npm run build` — passed, 43 routes generated including
  `/speaker-booking` and `/api/speaker-booking`.
- `npm run start` (local, port 3919) — `GET /` → 200, `GET /speaker-booking`
  → 200. Homepage HTML confirmed to still contain the original hero heading
  ("Learn the basics. Earn proof that your skills are real."), the demo
  credential code (`CAVA-2026-000001`), and the new `proof-of-work` section
  id, all in the same response.

## Open items for the team

1. **Real school/university names and dates** for the five university-talk
   gallery entries — needed from Jops. Currently `TODO` placeholders in
   `src/content/advocacy.ts` (`advocacy.gallery.items`).
2. **Wobex hackathon** exact event name/dates and a factual one-line recap
   — currently a `TODO` in the same file.
3. **Photo files** for all 18 placeholder slots listed above, sized and
   dropped into `public/proof-of-work/` (matching the aspect ratios the
   placeholders use: 4:3 for gallery photos, 21:9 for the hero photo, 4:5
   for the speaker page stage photos), then swap the `PhotoSlot` /
   `StagePhotoSlot` placeholders for real `next/image` `<Image>` elements
   using the same filenames and `alt` text already written in
   `advocacy.ts`.
4. **Speaker booking email/CRM integration choice.** The route currently
   sends a plain notification email to `gnclub.contactus@gmail.com` via the
   existing Resend integration (which is already configured with a live
   key in `.env.local`). No inquiries are persisted to a database or CRM —
   confirm whether that is sufficient, or whether inquiries should also be
   written to a `leads`-style table (there is already a `leads` table and
   `/admin/leads` page that a future iteration could extend) or forwarded
   to a CRM.
5. Confirm whether the Speaker Booking link should also appear in any other
   navigation surface (e.g. the dashboard sidebar) beyond the public header
   and footer.
