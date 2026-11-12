# open-video-brain

This repo cuts YouTube videos: longform episodes (16:9) and Shorts (9:16). Input: footage + script. Output: a finished video with SRT subtitles and chapter marks. You (Claude) make the editing decisions; Node scripts and Remotion do the mechanical work.

Code, file names and docs: English. On-screen text, captions and voice inserts use the language of the video (`project.json` → `language`).

## Golden rules

1. **Claude decides, scripts execute.** You write decisions as JSON (`work/edl.json`). Everything mechanical (frames, pauses, zooms, whooshes, loudness, render) is done by the scripts in `pipeline/`. Never invent timecodes – take source times from the transcript and `candidates.md`.
2. **Brand components only.** Graphics come exclusively from `remotion/components/` (overview: `remotion/components/CATALOG.md`, rules per component in its `meta.md`). No new colors, fonts or animations per video. Something missing → skill `/new-component`.
3. **Never edit `timeline.json` by hand.** Always change `edl.json` and run `npm run timeline -- <slug>`.
4. **No secrets.** Never read, print or copy `.env`.
5. **Relative paths.** Media in props are relative to the project folder (`work/assets/…`, `../_library/…`) or `brand:<name>`.
6. **Watch the costs.** Transcripts and voice inserts are cached – use `--force` only with a reason. Voice isolation, TTS and generation cost money.
7. **Don't make things up.** Numbers, prices, quotes and facts in graphics come from the script, the footage or a cited source. If it isn't backed up, don't show it. Label spoken numbers correctly (said "twelve ninety-nine a month" → show "$12.99/month").
8. **Voice clone only with consent** (`brand/voices.json` → `consent: true`) and never over the speaker's face.

## Workflow

| Step | Command | Result |
|---|---|---|
| Set up brand (once) | Skill `/welcome`, or `npm run brand -- --name … --accent …` | `brand/brand.json`, `brand/logos/`, `brand/fonts/` |
| Create project | `npm run new -- <slug> [--format short] [--source <longform>]` | `projects/<slug>/` |
| Ingest footage | `npm run ingest -- <slug>` | `work/footage.json`, audio proxies |
| Transcribe | `npm run transcribe -- <slug>` | `work/transcripts/*.json/.txt` |
| Find takes | `npm run align -- <slug>` | `work/candidates.md` |
| **Photo or graphic** | Skill `/visuals-plan`, then `npm run visuals -- <slug> [--search] [--pick <beat>:<nr>]` | `work/visuals.json`, media in `work/assets/` |
| Sound or music search | `npm run sounds -- <slug> --query "<words>" [--kind sfx\|music]`, then `--pick <name>:<nr>` | `work/sounds-candidates.md`, file in `work/assets/` |
| Website as B-roll | `npm run capture -- <slug> --url <url> --name <name> [--mode still]` | `work/assets/<name>.mp4` (scroll) or `.png` |
| Upscale a small photo | `npm run upscale -- <slug> --pick <beat>:<nr>` (costs money) | `work/assets/<beat>.jpg` |
| **Plan the edit** | Skill `/edit-plan` | `work/edl.json` |
| Voice inserts | `npm run voice -- <slug>` | `work/voice/` |
| Polish audio | `npm run audio -- <slug> [--isolate]` | `work/audio/` |
| Face track (for Shorts, once per longform) | `npm run faces -- <slug>` | `work/faces/*.json` – keeps the speaker centered in 9:16 |
| Build timeline | `npm run timeline -- <slug>` | `work/timeline.json` |
| Music (Shorts) | `npm run music -- <slug>` – once the cut is locked, exact length | `work/assets/music-*.mp3` |
| Draft render | `npm run render -- <slug> --draft` | `work/render/<slug>-draft.mp4` |
| Check | `npm run qa -- <slug> --draft` + skill `/qa-check` | `work/qa/report.md`, contact sheet |
| Final | `npm run render -- <slug>` | `output/<slug>.mp4`, `.srt`, `.chapters.txt` |

If `brand/brand.json` still says `"name": "Example Brand"`, suggest `/welcome` before the first video.

All in one: `/produce-video <slug>`. Shorts from a longform: `/shorts-cutdown <longform-slug>`. Preview: `npm run preview -- <slug>`. Component catalog: `npm run studio` or `npm run catalog`.

## Where things live

- `pipeline/` – CLI scripts. Schemas in `pipeline/schemas/` (edl, timeline, transcript, visuals).
- `remotion/Main.tsx` – composes speaker, graphics and sound. `remotion/lib/Design.tsx` – layouts (16:9 split/full/overlay, 9:16 split/full/overlay).
- `remotion/look/` – the house style as building blocks (colors `C`/`S`, `t()`, `Grow`, `Shell`, icons …), all fed from `brand/brand.json`.
- `remotion/components/<Name>/` – one folder per graphic: `def.ts` (schema, meta, sample), `<Name>.tsx`, `meta.md`. `npm run gen` regenerates the registry and `CATALOG.md`.
- `brand/` – tokens (`brand.json`), logos, sample photo, voices; `fonts/` and `sfx/` start empty and are filled with your own files (see `brand/README.md`).
- `projects/` – one folder per video. Videos with Shorts get a parent folder `<video>/longform/` + `<video>/shorts/<topic>/` (slugs stay flat; mind the relative paths in the EDL, see `projects/README.md`). `_library/` shared B-roll/music/images; `_template/`; `_demo/` and `_demo-short/` (test projects that need no API keys). This folder is Remotion's `public` directory.

## House style

These are the defaults of the example brand, and they are meant to be changed. Colors, type, layout values, pacing and loudness live in `brand/brand.json`; the rules below describe how Claude edits. Replace them with your own and keep them in sync with the component `meta.md` files and the skills.

**Picture**
- Light look: surface `look.surface` (#FCFCFD), white cards with a 3 px border `look.border` (#EAECF0), one accent color `look.brand` (blue #1570EF in the example brand), Inter 500/600 with −2 % tracking. Design grid 3840×2160, render 1080p. The frame rate follows the footage (50p → 25 fps, 60p → 30 fps, otherwise the source rate; 25 without footage) – override with `fps` in the EDL.
- **Three states in 16:9:** speaker (WIDE 1.0 / PUNCH 1.15 with centerY 0.575, alternating) · **split** (graphic panel left 58 %, speaker right) · **fullscreen** (B-roll, full-frame graphic).
- Media share (split + fullscreen) 70–80 % of the runtime. Of that media time, aim for ≈ 60 % real material (photos, B-roll, footage) and ≈ 40 % animated graphics.
- The speaker MUST be visible when showing or holding something. If the speaker points at an object, end the split before that moment – the object must not disappear behind the panel.
- Speaker size changes only at cuts, no faster than every 3 s, never the same size twice in a row. Chapters end on PUNCH (the punchline).
- No stock B-roll in the intro before the sting.

**Photo or graphic**
- Guiding question: *can it be photographed or filmed?* Concrete things, places, products and actions are a photo or video; graphics are for numbers, comparisons, processes and abstract terms. A photo/clip direction in the script is binding.
- The decision per beat lives in `work/visuals.json` (signals → `decide()`); `npm run visuals` fetches the media. `npm run timeline` warns about a graphic on a photo beat, chains of 3+ graphics, and real material below 50 %.
- A list of concrete things → one photo per item in the split, each on its cue, instead of a text `List`.
- No suitable image found → `Placeholder` + a note in the report, never a text card instead. Better a placeholder than a wrong image.
- Photos (stills, press images) always in the split, never fullscreen, with light motion (Ken Burns). Frame each photo on its subject with `fx`/`fy`; the subject must not be cut off. Free photos (e.g. Wikimedia Commons) keep their credit in `source`.
- Clips from other YouTube videos run in the monitor mockup (`Video` with `frame: "monitor"`), never bare in the split.

**Graphics**
- No eyebrow badges or pills above graphics.
- Source credits only on photos and B-roll clips (`Photo`, `Video`), never on graphics.
- Enumerations (lists, steps, tiles, options) = one box per element, the active box in the accent color, **without** an outer frame around the group. Single statements (number, quote, bars, meter) sit freely on the surface, without a box: `Statement`, `Meter` and `Compare` with `plain: true`, `Bars`. `Calendar`, `Columns`, `Delta` and `Flow` always sit on one white card. Spacing in the 3840 grid: `List` 34 px between boxes, `Flow` 36 px between stations (horizontal, left → right).
- A single number or quote → `Statement` with `plain: true`. The filled accent `Statement` card is reserved for the one key message of a section – use it sparingly.
- Processes and old → new comparisons stack vertically with a down arrow in between: `List` with `arrows: true` for a process, `Compare` with `plain: true` for old → new (no card). `Flow` is the horizontal variant for 2–4 short stations.
- 3–4 tiles in the split → 2×2 (`Tiles` with `grid: true`).
- Mix graphic types (`Tiles`, `Words`, `Compare`, `Bars`, fullscreen variants) instead of making everything a `List`. Use `List` for real enumerations with explanatory text.
- Topic overview: always numbered (`List` with `numbered: true`, number in a circle on the left, active box in the accent color) with descriptive titles ("Battery: preheating via update" rather than "Battery").
- Every split/fullscreen graphic gets a short `props.heading` ("Warranty", "Test drive", "Must be in the contract") so it reads without sound. `Placed` in `remotion/lib/Design.tsx` renders it (Inter 600, centered at the top, no badge).
- Bring a split or fullscreen in only when its content appears: the graphic starts on its first cue, never a half-empty panel with just a label. Keep labels above big numbers short ("The update" rather than "The update is called").
- Minimum hold 5 s per graphic. Elements appear on their cue (cue = source time of the word).
- Drop splits that add little or repeat the previous one – hold the previous graphic longer instead. Items that belong together become one graphic that builds up on its cues.
- No text that contradicts what is said.
- No logo corner, no chapter cards (chapters only via `chapter` in the EDL), no lower thirds. Name captions = `NameTag` (name only, Inter 700, white, no box/icon/role, bottom left), once per person at their first appearance.
- End card on a light surface without a gradient; the subscribe button and end card show the channel avatar (`brand:channel-avatar`).

**Dialogue**
- Don't chop the dialogue: keep breathing pauses after sentence ends, no micro-cuts mid-sentence. For the topic overview and chapter starts set `tightenPauses: false`, so no micro-cuts under 2 s appear.
- Replace incomplete sentences (a take that breaks off) with a complete take.
- Words that are numbers get a too-late start in the transcript; the timeline pulls them 0.25 s earlier so the word onset isn't clipped.

**Sound**
- Whoosh in 15 frames before every change speaker → split/fullscreen, whoosh out ends on the cut back (−25 dB) – `npm run timeline` sets these automatically. Opt out per graphic with `"whoosh": false` (e.g. where an impact sits).
- `click` on list items. Chapter start = `chapter_impact` (−27 dB). At most one punchline per video = `punchline_impact` (−26 dB). Last hit before the end card = `outro_hit`; no impact on the outro itself. Tension bed `tension` (−30 dB) under dramatic passages. Sting without a hit, hold it ≈ 3 s.
- Keep risers and hits subtle: no risers under speech (no `chapter_riser`, `power_riser`, `brand_riser`), no hit mid-sentence.
- Music bed under speech: longform ≈ −22 dB (default `audio.musicVolume` 0.08 in `brand.json`; override per video with `"volume"` in the EDL), lower under `tension`. Longform: bed from `projects/_library/music/` (loops). Shorts: `npm run music` generates music at the exact length with a final hit.
- Voice isolation (`npm run audio -- <slug> --isolate`) only when needed: listen per video and ask before isolating (billed per minute).

**Shorts**
- 9:16, karaoke captions (Inter Bold, active word larger, y 0.68; 0.86 in split). Zooms W 1.0 / M 1.2 / C 1.4 with a linear push of 1.2 %/s and headroom at the top (`headroomTop`). Size changes only at sentence boundaries or after B-roll/graphics, 2–5.5 s per shot.
- Fast: a picture change every 2–4 s, photos 2.5–4 s, the speaker never longer than ~5 s without an image, no photo twice in the same Short.
- Speaker always centered in 9:16 – crop per cut from the face track (`npm run faces`). Change the crop only when the size changes, never between pause cuts of the same shot (the image jumps).
- Seams sit on quiet spots (build-timeline checks the level), never in a word onset or tail.
- Voice in Shorts as a blend track: `audioVariant: "blend"` (isolated + original at −12 dB, `npm run audio -- <slug> --blend=-12 --lag=<samples>`), because voice isolation alone sounds tinny.
- Graphics from the longform in 9:16 **without** a dark gradient and without a logo, in two layouts: `split` (default: graphic on top, speaker below, scaled down with headroom) or `full` (content centered on the light surface). Captions turn dark automatically on light fullscreen graphics.
- A single number or statement in a Short goes as a headline on a matching photo (`Video` with `headline`), not as a stand-alone `Statement` surface.
- `Video` in a Short: speaker below (`split`) or the clip full-frame (`full`).
- Captions: numbers as digits ("19,990", "27.5 percent"; spelled-out numbers are converted automatically for German only), number and unit on one line, no hyphenation mid-word, no short word alone on a page.
- End on the punchline. No CTA element.

## Learnings from reviews

Every correction from a review becomes a rule. Learnings take precedence over everything above.

**Process for objections:** Collect every objection from a review and record it as a rule: here as a dated learning, and also where it applies (the component's `meta.md`, or a skill such as `/edit-plan`). If it is a soft taste decision that might only apply to this one video, ask first whether it should become a rule. After each correction round, list briefly: what became a rule, what is still open.

From time to time, fold learnings that have held up into the house style above and keep this list short.

Format – one line, phrased as a rule, with the date and the video it came from:

- YYYY-MM-DD: Keep labels above big numbers to two or three words; long labels compete with the number (`<slug>`).
