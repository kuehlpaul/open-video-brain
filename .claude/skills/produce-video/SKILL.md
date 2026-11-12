---
name: produce-video
description: Edit a complete YouTube video (longform or Short) autonomously from footage + script – ingest, transcription, edit plan, render, QA, report. Call with /produce-video <slug>.
---

# Producing a video

**Input:** `projects/<slug>/input/footage/` + `input/script.md` + `project.json`
**Output:** `projects/<slug>/output/<slug>.mp4` (+ `.srt`, `.chapters.txt`) and `output/REPORT.md`

Work autonomously until the video is done. Only stop and ask if:
- script or footage are missing, or `npm run doctor` fails,
- more than 20 % of the script sentences have no usable take (score < 0.7),
- a paid action would be needed that the script doesn't ask for (video generation, isolating > 30 min of material).

At the start, create a task list with the steps below and tick them off.

## Steps

1. **Check:** `npm run doctor`. Read CLAUDE.md, especially "Learnings from reviews".
2. **Ingest:** `npm run ingest -- <slug>` (skipped for Shorts with `sourceProject`).
3. **Transcription:** `npm run transcribe -- <slug>` (cached).
4. **Takes:** `npm run align -- <slug>` → read `work/candidates.md`. For context outside the script: `work/transcripts/_all.txt`.
5. **Photo or graphic:** skill `/visuals-plan` → `work/visuals.json`, `npm run visuals -- <slug> --search`, look at the candidates, `--pick`. (Short Shorts without showable things: skip.)
6. **Edit plan:** follow skill `/edit-plan` → `work/edl.json`. Chapters (`chapter`) on the first segment of every `#` section.
7. **Voice inserts** (only if the EDL has any): skill `/voice-insert`.
8. **Audio:** `npm run audio -- <slug>`. `--isolate` only if noise is audible (wind, traffic, reverberant hall) – visible as Scribe audio events like "(wind)" or "(traffic)" in the transcript, or when the human says so. It costs per minute: ask first if a human is available.
9. **Timeline:** `npm run timeline -- <slug>`. On errors, fix edl.json and repeat. Read every warning and decide whether it needs fixing.
10. **Draft:** `npm run render -- <slug> --draft`.
11. **Check:** skill `/qa-check` with `--draft` – including the house-style check (badges, boxes, source credits, hold times, speaker visible when showing something). Problems → back to step 5. At most 3 rounds; then continue with the best state and list the remaining issues in the report.
12. **Final:** `npm run render -- <slug>`, then `npm run qa -- <slug>`.
13. **Independent look** (longform): start the `qa-reviewer` agent with the slug. Work its findings in, or explain in the report why not.
14. **Report:** write `output/REPORT.md` using the template below.

## Report template

```markdown
# <Title> (<slug>)

**Done:** output/<slug>.mp4 · <duration> · <format> · QA: <PASS/WARN/FAIL>

## Edit
- <n> script sentences, <n> used. Missing/shortened: S7 (no clean take), …
- Uncertain takes (please listen): S12 at 03:41 – "…"
- Unscripted moments kept: …

## Graphics
Media share: <n> % (target 70–80 %), real material <n> %

| Time | Component | Layout | Content |
|---|---|---|---|

## Missing media
- Placeholder at 04:12: "photo of a city skyline at night" – please put it in work/assets/

## For the upload (done by a human)
- [ ] Title + thumbnail
- [ ] Description with chapters from `<slug>.chapters.txt`
- [ ] Upload subtitles `<slug>.srt`
- [ ] Place the end screen elements in YouTube Studio on the dashed zones (values in remotion/components/EndCard/meta.md)

## Cost of this run
Transcription <min>, isolation <min>, TTS <characters>, generation <count>
```

## Shorts

- `project.json` → `"format": "short"`. From a longform: use skill `/shorts-cutdown` instead of this one.
- Captions `short` on, framing via `framing.focusX` (face centered), target ≤ 60 s. Shorts rules: CLAUDE.md → "Shorts".

## When something goes wrong

- `edl.json is invalid` → the error names path and field; fix exactly there.
- Clip not in `work/footage.json` → file name exactly as in `input/footage/` (case, extension).
- Render aborts → `DEBUG=1 npm run render -- <slug> --draft` for the stack trace; check the footage codec with `ffprobe`.
