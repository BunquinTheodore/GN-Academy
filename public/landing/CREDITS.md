# Landing page photography

All of these are stock media used under the [Pexels
licence](https://www.pexels.com/license/), which permits commercial use and does
not require attribution. They are credited anyway, because knowing where a file
came from is worth more later than the two minutes it costs now.

| File | Photographer | Source |
|---|---|---|
| `hero-loop.mp4` + `hero-loop-poster.jpg` | Dario Fernandez Ruz | https://www.pexels.com/video/woman-using-laptop-at-home-9130469/ |
| `learner-portrait.jpg` | Artem Podrez | https://www.pexels.com/photo/8511892/ |
| `remote-work.jpg` | Ketut Subiyanto | https://www.pexels.com/photo/4623361/ |
| `focused-desk.jpg` | Mikhail Nilov | https://www.pexels.com/photo/8297078/ |

## Two rules about these images

**Nobody in them is a learner, and the page must never suggest otherwise.**
They carry no caption, no name, no quote and no role. The moment one is labelled
"Maria, VA, Cebu" it becomes a fabricated testimonial on the one page whose
whole argument is that a claim nobody can check is worth nothing. When there are
real graduates willing to be named, replace these with real photographs of them,
and delete this paragraph.

**No AI-generated stock.** Pexels search returns results tagged
`AI GENERATIVE`, and one was rejected during this selection for that reason. A
platform that sells verified human skill should not illustrate itself with
people who do not exist.

## The hero loop

`hero-loop.mp4` is 540x960, thirteen seconds, silent, and 1.47 MB. Keep it around
that size: this audience is largely on mobile data, and the hero is the first
thing that loads. `src/components/motion/hero-media.tsx` only mounts the video
on a large screen with a fine pointer and no reduced-motion preference, so a
phone never fetches it and gets `hero-loop-poster.jpg` instead. The poster is a
real frame from the same clip, so the still and the moving version are the same
scene.

`hero-portrait.jpg` is unused since the video replaced it. Kept because it is
the obvious still to fall back to if the loop is ever dropped.

## Replacing one

Downloaded pre-sized through the Pexels API, so no cropping happens in the
browser: the hero at 900x1080 (its container is aspect-[5/6]), the band portrait at 900x1200, landscape at 1000x750. Keep those ratios or the
`aspect-[3/4]` and `aspect-[4/3]` wrappers in `src/app/page.tsx` will letterbox.
