# COURSE REVIEW

A slow, learner's-eye read of every course in the catalog (2026-09-06), done in
response to: *"make it more legit and more interesting and more learnable, not
just AI slop."* Six reviewers each read a cluster of courses in full — every
lesson, every quiz, every assignment brief — and reported concrete problems
with quotes and locations. This file compiles their findings into one
priority-ordered plan. Companion to `IMPROVEMENTS.md` (the code/security
audit) and the state files (`PROGRESS.md`, `DECISIONS.md`).

**Nothing has been rewritten yet.** This is the findings pass; rewriting
starts after you've reviewed this.

---

## 0. The headline, before the detail

The fear behind "not just AI slop" doesn't hold for most of this catalog. It
is not vague, generic, cut-and-paste filler — it's unusually disciplined
about not inventing statistics, refuses to assert facts that go stale
(fees, tax rates, platform features), and every reviewer independently
verified the arithmetic in the finance-adjacent lessons as correct. Quiz
design is consistently the strongest asset: scenario-based judgment
questions with plausible distractors, not trivia, across all 19 courses.

The actual problems are five specific, fixable things:

1. **A single repeated template makes the writing look mechanical on a
   skim**, even where the content underneath is good: nearly every lesson
   across nearly every course opens with "[Filipino name], a [job] in [PH
   city], [scenario]," and closes on a bolded one-line aphorism or a
   "Do this now" homework prompt. Individually fine. Repeated 300+ times
   across the catalog, it's the thing a sharp learner will notice and the
   closest this content comes to reading as machine-written.
2. **Four assignments have a `min_words` value well below what their own
   `brief_mdx` tells the learner to write** — a real, mechanical bug that
   lets a learner submit less than half of what the brief describes.
3. **Real, confirmed cross-course duplication** — one paid course still
   rehashing ~80% of two lessons from a free prerequisite, two paid courses
   teaching the identical framework with no acknowledgment, two courses
   with a near-identical fraud-recognition chapter.
4. **A handful of specific, unhedged claims that could be stale or wrong**
   — one serious (an entire module of a paid course built on a product
   feature that could not be verified to exist), several minor (exact
   Canva tier gates, an Instagram character-count figure, an exact CLI
   slash-command list).
5. **CAVA, the flagship ₱1,499 course, has no human review step at all** —
   it auto-issues the credential on a quiz pass, while every other paid
   course already requires a human-approved final project. This is the
   biggest single gap between what's sold and what's currently proven.

None of the 19 courses needs a full rewrite. Two need substantial chapter
rewrites (Bookkeeping Basics' compliance chapter, Prompt Engineering with
Claude). Everything else needs targeted fixes, not new prose from scratch.

---

## 1. Priority-ordered fix list (whole catalog)

| # | Course | Issue | Scope |
|---|---|---|---|
| 1 | **Prompt Engineering with Claude** | An entire module (3 lessons) is built on "Claude Cowork," a feature that could not be verified — this is a real legitimacy risk, not a style nit. Also: no actual prompt-engineering technique is taught anywhere (no system/user prompts, few-shot, chain-of-thought, XML structuring), duplicates AI Essentials for Work's framework in module 1, several unhedged CLI/product specifics. | **Substantial rewrite** |
| 2 | **Bookkeeping Basics for Freelancers** | Withholds stable, nameable facts (8% gross-receipts tax option, COR/Form 2303, OR vs. Sales Invoice, 1701 forms) behind a blanket "rules change, verify yourself" — exactly the info a paying learner needs most. Assignment permits a fully invented scenario. | **Substantial rewrite of ch. 4 + assignment tightening** |
| 3 | **CAVA** | No human review step; credential currently proves "read ~1,600 words, passed a quiz," not the client-ready work the course sells. Lessons are thin (no worked example shown in full anywhere) for a ₱1,499 "professional" course. | **Add final project (see §3) + add one worked example per lesson** |
| 4 | AI Essentials for Work | Chapter 4 is ~80% a rehash of the free Basic AI course, not a build on it. | Targeted rewrite of ch. 4 |
| 5 | Customer Support with AI | Never names a single real AI tool or shows one real prompt in 12 lessons, despite the title. | Add 1 lesson naming/using 2-3 real tools |
| 6 | Spreadsheets and Data with AI | Never shows one literal spreadsheet formula. | Add worked formulas per function family |
| 7 | AI-Powered Digital Marketing | Title promises "digital marketing," content never opens an ad platform. `min_words` (300) vs. brief (800-1,000) mismatch. One unhedged PH-send-time claim. | Fix word-count bug + hedge the claim; consider retitling scope |
| 8 | Canva and Visual Content | `min_words` (500) vs. brief (700-900) mismatch. | One-line fix |
| 9 | Client Communication in English | `min_words` (320) vs. brief (800-1,000) mismatch — the biggest gap of the four. Assignment bans the one topic (money language) the course spends a whole chapter on. | Fix word-count bug; reconsider the money-topic ban |
| 10 | Spreadsheets and Data with AI (assignment) | `min_words` (700) vs. brief (800-1,000) mismatch. | One-line fix (bundle with #6) |
| 11 | AI Social Media Management | One unhedged, stale-prone Instagram character-count claim. No visual/video-AI tool coverage despite being a visual-medium course. | Hedge the claim; consider scope note |
| 12 | Basic Blockchain / Basic Finance | Near-identical fraud-recognition framework in both courses' chapter 3, re-skinned. | Trim overlap, cross-reference instead of repeating |
| 13 | Basic Finance | The "this is education, not financial advice" disclaimer is copy-pasted near-verbatim 3 times within one file. | State once at course level, drop from lesson bodies |
| 14 | AI Foundations | Exam Q4 tests context-window limits, a concept never taught in any lesson. No lesson has a hands-on exercise. | Add 1-2 sentences to close the gap; add light exercises |
| 15 | Short-Form Video Editing | Never shows where a button is in any actual editing app, despite being a hands-on skill course; one explanation repeated near-verbatim across 5 lessons. | Add app-specific pointers or disclose the scope choice; trim repetition |
| 16 | Online Selling in the Philippines | Never names an actual marketplace (Shopee/Lazada/TikTok Shop), always "the large marketplace." | Consider naming platforms with a "verify current terms" caveat |
| 17 | Freelancing Fundamentals / Resume-Portfolio-Job Hunting | Dense, literary prose register that will tax an ESL, mobile-first reader; template fatigue across lessons. | Copyedit pass: shorter sentences, vary lesson openings |
| 18 | Resume, Portfolio and Job Hunting | Describes `/verify` and `/talent` pages by name — **needs a check that this matches the live product** before shipping (flagged, not confirmed broken). | Verify against actual routes |
| 19 | Project and Client Operations, Online Safety and Scam Defence, Basic AI | No significant issues found. Good as-is; only the catalog-wide template-fatigue note applies. | No action needed beyond the cross-cutting fix (§2) |

---

## 2. The one fix worth doing catalog-wide

If only one thing gets done across all 19 courses, it's de-templating the
lesson openers and closers. Every reviewer flagged the same pattern
independently without being told to look for it:

- Opener: **"[Filipino first name], a [job], in [PH city], [one-sentence
  scenario]."** Used 300+ times across the catalog.
- Closer: a single bolded aphorism, or "Do this now" / "Try this" / "What
  you can now do."

The fix is not to remove the device — named, concrete, local scenarios are
genuinely good pedagogy and the main reason this content beats generic
Western career/AI advice. The fix is **variety**: open some lessons with a
worked example instead of a vignette, some with a direct question, vary the
closing device by course or every other lesson. This is a copyedit-scale
change, not a rewrite, and it's the single highest-leverage fix for the
"reads as AI-written" complaint specifically.

---

## 3. CAVA: adding the reviewed final project

This is the concrete follow-up to your mid-conversation request ("add a
final project for each course... on the paid ones") — already true for 12
of 13 paid courses; CAVA is the one gap. Converting it means:

1. **Database**: set `certifications.requires_assignment = true` for CAVA,
   insert an `assignments` row, and decide what happens to the existing
   `cava-knowledge-exam` assessment (likely: keep it as a formative
   chapter-style check rather than the credential-issuing event, or retire
   it — needs a decision before writing the migration).
2. **Content**: the reviewer's read of CAVA's own lessons already surfaces
   what a rigorous project should require, since the course's best material
   is inherently producible:
   - A **voice brief** (the course's own signature technique, currently
     never shown worked) plus one draft written from it.
   - A **report** built from a small raw dataset, following the exact
     structure the course teaches (one-line summary, 3 bullets, next
     step), with the numbers demonstrably pulled by the learner rather
     than invented.
   - **Minutes** from a real or simulated meeting, with visible evidence of
     a human catching and correcting an AI transcription error (the
     course's own recurring example).
   - A short **written scenario response** for the judgment module
     (privacy risk + pricing question) rather than a produced artifact,
     since that module's value is decision-making, not output.
3. **Lessons**: add one full worked example per lesson while this is being
   touched anyway (the reviewer's top finding: no lesson currently shows an
   actual prompt, voice brief, or report end to end).

I'd sequence this as its own scoped piece of work once you've reviewed this
document, not bundled into the catalog-wide copyedit pass — it touches the
database schema and credential-issuance path, not just course JSON.

---

## 4. What I'd do next

Given the size, I'd sequence the actual rewriting as:

1. **Prompt Engineering with Claude** — verify or pull the Cowork claims
   first (this is the one item that's a legitimacy risk, not a polish
   item), then rebuild around real technique.
2. **CAVA final project** (§3) — its own scoped migration + content pass.
3. **Bookkeeping Basics chapter 4** — add the stable BIR facts back in.
4. **The four `min_words` bugs** — five-minute fixes, bundle together.
5. **The catalog-wide de-templating pass** (§2) — highest visible impact
   per hour spent, can happen incrementally per course.
6. Everything else in the priority table, roughly in the order listed.

Let me know which of these you want to start with, or if you'd rather I
just work down the list in order.
