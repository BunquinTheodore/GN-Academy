# DECISIONS

One line each: decision · reason · alternative rejected.

- 2026-08-18 · Scaffolded into `gn-academy/` subfolder then moved to repo root · npm forbids capital letters and the working dir is `C:\Academy` · renaming the user's directory rejected (their filesystem, not mine).
- 2026-08-18 · Kept create-next-app's Turbopack `dev`/`build` scripts · Next 15.5 default, faster builds · webpack fallback rejected unless a plugin needs it.
- 2026-08-18 · MDX blog via `next-mdx-remote` (Phase 4) rather than Contentlayer · Contentlayer is unmaintained and breaks on Next 15 · Contentlayer rejected.
- 2026-08-18 · `.env.local` created with obvious placeholder values so `npm run dev` fails loudly-but-clearly at the Zod env gate, not with cryptic SDK errors · keys arrive later from the human · leaving no .env.local rejected (worse DX).
