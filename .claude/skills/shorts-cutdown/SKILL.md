---
name: shorts-cutdown
description: Find and cut 3–7 YouTube Shorts from a transcribed longform project (9:16, karaoke captions, ≤ 60 s) following the Shorts rules in CLAUDE.md. Call with /shorts-cutdown <longform-slug> [count].
---

# Shorts from a longform

Requirement: the longform is transcribed. Footage and transcripts are reused.

## 1. Find candidates

Read `projects/<longform>/longform/work/transcripts/_all.txt` and the script. One topic of the episode = one Short. Good Shorts:
- **one** idea, understandable without prior knowledge, 40–55 s
- a strong first sentence (irony, a number, a contradiction) – may be pulled forward from the middle
- ends on a punchline
- concrete numbers/products > general statements; unbacked numbers go

Per candidate: list of source times (segments), what gets cut, the hook. If a human is around, have it confirmed; otherwise take the best 3.

## 2. Per Short

Once per longform beforehand: `npm run faces -- <longform>` (face track, so the speaker is centered in every cut).

```bash
npm run new -- <longform>-short-<topic> --format short --source <longform>
```

`work/edl.json` (skill `/edit-plan`, Short rules):
- `"format": "short"`, captions `short` (default)
- segments from the longform footage; keep breathing pauses after sentence ends, no micro-cuts mid-sentence; seams on quiet spots
- the pipeline does the zooms (W/M/C, push 1.2 %/s, changes only at cuts ≥ 2 s)
- speaker about 40 % of the time, the rest graphics/B-roll alternating every 2–4 s; the speaker never longer than ~5 s at a stretch without an image
- `pacing`: `maxPause` 0.35, `padding` 0.08
- voice as a blend track: `npm run audio -- <slug> --blend=-12 --lag=<samples>`, then `"audioVariant": "blend"`
- graphics: graphics from the longform in the 9:16 layout – `split` (default: graphic on top, speaker below) or `full` (centered on the light surface). Hold times in a Short: photos 2.5–4 s, graphics as long as their keywords (from ~3.5 s).
- a single number/statement → as a `headline` on a matching photo (`Video`), not as a stand-alone `Statement` card. One photo per product/place, no photo twice in the same Short.
- frame every photo on its subject (`fx`/`fy`, zoom point `zx`/`zy` on the subject); the 9:16 split panel is ≈ 1.125:1 – the subject must be inside the crop.
- sounds: `swoosh_fast` on changes, `pop_soft` on list items, `sub_hit` on the hook
- end: on the punchline (music without a lift), no CTA element

Then `npm run timeline`. Once the cut is locked: `npm run music -- <slug>` (music at the exact length, final hit on the last frame), put the file into `music` in the EDL, run `npm run timeline` again. Then `npm run render -- <slug> --draft`, skill `/qa-check`, final. If the length changes after the music step → generate the music again.

## 3. Report

`projects/<longform>/longform/output/SHORTS.md`: per Short the slug, length, hook sentence, title suggestion (≤ 60 characters), path, what was cut.
