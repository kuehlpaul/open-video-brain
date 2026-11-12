---
name: edit-plan
description: Plan a project's edit as work/edl.json – choose takes, order, graphics (split/full/overlay) with cues, voice inserts, sounds, music. Use whenever an EDL is written or changed.
---

# Writing the edit plan (edl.json)

The EDL is the only file that holds editing decisions. Schema: `pipeline/schemas/edl.ts` (binding). Examples: `projects/_demo/work/edl.json` (longform) and `projects/_demo-short/work/edl.json` (Short). The demos are short – they show the format, not the pacing.

## Read first

1. `CLAUDE.md` – especially "House style" and "Learnings from reviews"
2. `work/candidates.md` – takes per script sentence with source times and score
3. `input/script.md` – directions in `[ … ]`
4. `remotion/components/CATALOG.md` – all graphics; read the `meta.md` of every graphic you plan to use
5. `ls projects/_library/broll projects/_library/images projects/_library/music` and `work/assets/`
6. **`work/visuals.json`** (skill `/visuals-plan`): photo/video/graphic decision per beat. If it doesn't exist yet and the script mentions things, places, products or actions: run `/visuals-plan` first, then continue here.

## Choosing takes

- Per sentence, the take with the highest score; on a tie, the later one.
- Score < 0.9 → compare `heard` with the script. Different wording is fine if meaning and facts match. Slips, broken-off sentences, repeated statements → another take or leave it out. Replace an incomplete take with a complete one.
- **Consecutive sentences from the same take = ONE segment.** build-timeline tightens pauses (> 0.4 s down to a 0.08 s margin).
- `in` = first word − 0.15 s, `out` = last word + 0.2 s. Never cut mid-word; don't cut away breathing pauses after sentence ends.
- Sentence without a usable take → leave it out and mention it in the report.

## Longform structure

1. Hook (1–3 sentences) – immediately, no logo before it
2. `graphic` **Sting** (≈ 3 s, no hit) right after the hook – only if `brand/brand.json` → `logo.sting` is `true`; otherwise go straight to the overview
3. Topic overview as a **List** with `"numbered": true` (split, one box per topic, numbered 1, 2, 3 …, a click per item, `tightenPauses: false`)
4. Chapters following the `#` headings: `"chapter": "<title>"` on the first segment of the chapter (→ YouTube chapters); chapter start only with `chapter_impact` at `"db": -27` (no risers under speech), `tightenPauses: false`
5. Per topic 70–80 % media share: alternate speaker ↔ split ↔ fullscreen
6. Outro, then `graphic` **EndCard** (12–20 s)

**Short:** hook first, no logo up front, captions `short`, graphics in the 9:16 layout (`split` = graphic on top, speaker below; `full` = centered). End on the punchline, no CTA element.

## Photo or graphic

For every beat in `work/visuals.json` the decision computed there applies: `photo` → `Photo` (split, Ken Burns, `source` from visuals.json), `video` → `Video`, a website recording from `npm run capture` → `Video` with `frame: "monitor"` (a capture still → `Photo`), `photo+headline` → `Photo` (the number follows as `Statement plain`; only `Video` has a `headline` prop so far), `graphic` → a graphic from the catalog. A beat with a photo decision is **not** set as Statement/List/Tiles (`npm run timeline` warns). Media missing: `Placeholder` + report. Deviate only via `override` in visuals.json, with a reason.

## Graphics (overlays)

```json
{ "id": "price", "component": "Statement", "layout": "split",
  "at": { "seg": "price", "t": 611.4 }, "duration": 6,
  "props": { "plain": true, "heading": "Pricing", "label": "Per month", "value": "$12.99", "f": { "t": 612.8 } } }
```

- **layout:** `split` (panel left, speaker right) · `full` (fullscreen) · `overlay` (over the speaker: SubscribeButton, Captions, NameTag). Allowed layouts are listed in CATALOG.md. Without one, the first applies.
- **at (start):** `{ "seg", "t": source second }` preferred · `{ "seg", "offset": s }` · `{ "out": s }`.
- **Cues in props** (when elements appear): `{ "t": source second }` – the word from the transcript · `{ "s": seconds from graphic start }` · number = frames · `-1` = immediately.
- **Media in props (`src`):** relative to the project folder (`work/assets/photo.jpg`, `../_library/images/…`) or `brand:sample-photo`. The pipeline adds the image size.
- **Heading:** `"heading": "Test drive"` in the props of a split/fullscreen graphic puts a short heading centered at the top. Always set it on topic graphics.
- **A graphic starts ≈ 5 frames before its first cue**, holds at least 5 s and ends at a sentence boundary. Never two panels/fullscreens at the same time.
- Consecutive graphics with the same content = one graphic across several footage segments (it keeps running across the cut).
- `"whoosh": false` where an impact sits at this spot.

## Directions in the script

| In the script | In the EDL |
|---|---|
| `[GRAPHIC <Component>: …]` | overlay of that component, cues on the keywords |
| `[VOICE text]` | `voiceInserts` + `voice` segment → skill `/voice-insert` |
| `[BROLL …]` | `Video` with a clip from `_library` or `work/assets`; if missing: `Placeholder` + report (or `/generate-asset`) |
| `[PHOTO …]` | `Photo` in the split (via `/visuals-plan`) |
| `[SUBSCRIBE]` | SubscribeButton (overlay) |

## Sounds (sfx)

```json
"sfx": [
  { "name": "chapter_impact", "at": { "seg": "ch2", "offset": 0 }, "db": -27 },
  { "name": "click", "at": { "seg": "topics", "t": 452.1 } }
]
```
Keep risers and hits subtle: no risers under speech, at most one punchline per video (`punchline_impact` −26 dB), no hit mid-sentence, `tension` −30 dB.
Available: `click, chapter_riser, chapter_impact, power_riser, punchline_impact, brand_riser, brand_hit, outro_hit, tension, jingle, pop_soft, sub_hit, swoosh_fast` (the pipeline sets whooshes itself). `db` optional (default −18).

## Other fields

- `"music"`: longform `{ "file": "../_library/music/<bed>.mp3", "volume": 0.1 }` (loops, ≈ −20 dB). Short: only once the cut is locked, `npm run music -- <slug>`, then `{ "file": "work/assets/music-<hash>.mp3", "fadeIn": 0, "fadeOut": 0 }`
- `"captions"`: on by default for Shorts (`short`), off for longform (there is the .srt)
- `"pacing"`: change only if the video needs it (defaults in `brand/brand.json`)

## Check

`npm run timeline -- <slug>` must run without errors. The summary shows runtime, removed pauses, graphics, **media share** (longform target 70–80 %, ≈ 60 % of it real material) and sounds. Read every warning.
