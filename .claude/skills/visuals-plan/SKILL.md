---
name: visuals-plan
description: Decide per beat whether a photo, a video clip or an animated graphic is shown, and source the media (work/visuals.json). Use before /edit-plan – whenever the script mentions things, places, products or actions that can be shown.
---

# Photo, video or graphic? (work/visuals.json)

Why: a script that asks for a picture of a concrete object ends up as a text card far too easily. Graphics are for numbers and relationships, not for things you can photograph.

**Guiding question: can it be photographed or filmed?** Yes → photo/video. No (number, comparison, process, abstract term) → graphic.

## Steps

1. **Read:** `input/script.md` (especially directions in `[ … ]`), `work/candidates.md`, `work/transcripts/_all.txt`, CLAUDE.md "House style" and "Learnings".
2. **Form beats:** one beat = one thought (usually 1–3 sentences), `from` = source second of the first word (the same time as `at.t` in the EDL). Not every sentence needs a beat; leave out pure speaker passages.
3. **Name the signals** (only these; the weights are in `pipeline/schemas/visuals.ts` – the script computes the decision, not you):

| Signal | When | Side |
|---|---|---|
| `concrete_thing` | a thing, place, product, model or person is named (espresso machine, train station, smartphone) | picture +3 |
| `action` | a visible action (pouring, cooking, driving, installing) → video | picture +3 |
| `brand_or_place` | a manufacturer or place with a well-known motif | picture +2 |
| `script_says_image` | the script direction asks for a photo/clip/B-roll – **binding** | picture +5 |
| `list_concrete` | list of concrete things without explanatory text (one photo per item in the split, on its cue) | picture +3 |
| `number` | number, percentage, price, deadline | graphic +3 |
| `comparison` | comparison, change, ranking | graphic +3 |
| `process` | process, sequence, schedule | graphic +2 |
| `abstract` | abstract term (subsidy, efficiency, risk) | graphic +2 |
| `list_explained` | list with explanatory text per item | graphic +1 |

   Result: `photo` · `video` (with `action`) · `photo+headline` (picture wins and the beat has a `number`: photo with `headline`) · `graphic`. **Tie → picture** (media time ≈ 60 % real material). If the grid gets it wrong: `override: { decision, why }` with a real reason.
4. **Search terms** (`queries`): concrete, in English and in the video's language if different ("espresso machine portafilter close-up"). No brand logos or invented models as targets.
5. **Check and search:**
   - `npm run visuals -- <slug>` – validates, shows the decisions, picture:graphic ratio, open beats.
   - `npm run visuals -- <slug> --search` – searches `_library`, Wikimedia Commons, Openverse, NASA, Pexels, Pixabay, Unsplash, Coverr (keys optional in `.env`; never read it). The sources take turns in the candidate list; `--n 6` for a wider pick, `"providers": [...]` on a beat to restrict it (e.g. `["nasa"]` for space, Earth, weather, climate). Video clips come from NASA, Pexels, Pixabay and Coverr. Downloads only freely licensed media to `work/assets/candidates/`, overview in `work/visuals-candidates.md`.
   - **NASA:** public domain, but NASA logos/insignia and recognizable people are not cleared for anything that looks like an endorsement. **Coverr:** no logos/brands are licensed, never register Coverr clips in Content ID.
   - **Look at the candidates** (Read on the image file): right subject? Object not cut off? No third-party logo, no recognizable person without reason? Then `npm run visuals -- <slug> --pick <beat>:<nr>` (sets `asset` and `source`).
   - **Small photos** (⚠ small, < 1600 px) are only usable upscaled: `npm run upscale -- <slug> --pick <beat>:<nr>` (Magnific Precision, costs money – ask first; keeps the content, invents no detail). Then check the result at 100 %.
   - The script does not download press images or YouTube clips (rights). Search links (Google Images, Getty Editorial, dpa Picture-Alliance, YouTube, own portals from `brand/data/press-portals.json` = `[{ "name": "…", "searchUrl": "https://…{q}…" }]`) are in `visuals-candidates.md`. Getty/dpa images only with a license; put the file into `work/assets/` by hand and set `asset` (and `source`) in visuals.json.
   - **Website, app, configurator, price list** as the subject: record it instead of searching – `npm run capture -- <slug> --url <url> --name <beat-id>` (scroll video, ~0.25 screen heights per second, 8 s; `--mode still` for a PNG). If it warns about an overlay (cookie notice, banner), run it again with the suggested `--hide "…"` or `--click "<accept button>"`. Look at one frame before using it. Set `asset` to the file and `source` to the line it prints ("Screenshot: <domain>").
6. **Good finds go to the library:** copy file + `.json` to `projects/_library/images|broll/`, with a descriptive file name.
7. **Continue with `/edit-plan`.** There, every beat with an `asset` becomes a `Photo` (photo in the split, Ken Burns) or `Video` (clip); `photo+headline` becomes a `Photo` in the split and the number follows as `Statement plain` (only `Video` has a `headline` prop, `Photo` doesn't yet – open). Third-party YouTube clips with `frame: "monitor"`.

## Hard rules

- **Don't quietly fall back to text.** If nothing usable turns up: set a `Placeholder` and mention it in the report ("better a placeholder than a wrong image"). No invented or AI-generated image of a specific real product (golden rule 7); `/generate-asset` only for generic mood shots.
- Photos always in the split, never fullscreen, with Ken Burns; `fx`/`fy` on the subject. Source credit on the photo, not on graphics.
- Numbers and quotes stay `Statement plain`; a photo with `headline` only works once `Photo` gets that prop (`Video` already has it).
- Never more than 2 graphics in a row without a photo/video. `npm run timeline` warns (real material < 50 %, graphic chains, graphic on a photo beat).
- List of concrete things ("kettle · toaster · coffee grinder"): one photo after another in the split, each on its cue – no text `List`.

## Example

```json
{ "beats": [
  { "id": "espresso-intro", "from": 279.75, "to": 296,
    "text": "A classic espresso machine with a portafilter",
    "signals": ["script_says_image", "concrete_thing"],
    "queries": ["espresso machine portafilter", "espresso machine kitchen counter"] }
] }
```
