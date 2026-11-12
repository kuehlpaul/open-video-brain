---
name: qa-check
description: Check a rendered video – automatic checks plus a visual check of the contact sheet and single frames against the house style; turn findings into fixes in edl.json. Call with /qa-check <slug> [--draft].
---

# Checking a video

## 1. Automatic

```bash
npm run qa -- <slug> --draft      # draft
npm run qa -- <slug>              # final
```

Read `work/qa/report.md`. What it means:
- **Script coverage** missing → take is missing from the EDL or was clipped when pauses were tightened (set `out` later, `tightenPauses: false` for the segment).
- **Duplicate passages** → the same sentence from two takes in the EDL.
- **Silence > 1.2 s** outside graphic segments → check segment boundaries.
- **Black frames** → clip end past the end of the file, or missing B-roll.
- **Loudness** off → check the audio track (`work/audio/`), if needed `npm run audio -- <slug> --force`.

Also look at the summary of `npm run timeline`: **media share** longform 70–80 % (≈ 60 % of it real material); clearly below → more split/fullscreen.

## 2. Visual check

Look at `work/qa/contact-sheet.jpg` with the Read tool and grab suspicious spots as single frames:

```bash
ffmpeg -y -loglevel error -ss <second> -i <video> -frames:v 1 projects/<slug>/work/qa/at-<second>.jpg
```

Video time ↔ segments: `work/timeline.json` (`from`/`duration` in frames, `fps`).

**House style**
- [ ] no eyebrow badges/pills
- [ ] source credits only on photos and clips
- [ ] enumerations: one box per element, active box in the accent color, no outer frame · single statements without a box
- [ ] every graphic ≥ 5 s, elements appear on their cue (not before), split/fullscreen only once content is there
- [ ] split/fullscreen graphics have a short `heading`
- [ ] numbers/names in graphics = what is said (units correct)
- [ ] split: speaker on the right fully in frame, face not covered by the panel
- [ ] speaker visible when showing/holding/pointing at something
- [ ] photos in the split, framed on the subject, subject not cut off
- [ ] no placeholder graphic in the final without a note in the report
- [ ] longform: hook first, no logo before it · end card 12–20 s at the end

**Sound**
- [ ] whoosh on every change to/from split/fullscreen, no double whooshes next to an impact
- [ ] click sounds sit on the keywords
- [ ] no risers under speech, at most one punchline impact, no hit mid-sentence
- [ ] music under speech audible but not distracting

**Shorts**
- [ ] face in frame and centered at all zoom levels (W/M/C), headroom at the top
- [ ] captions readable, not covered by the YouTube UI (bottom quarter, right edge); numbers as digits, number and unit on one line
- [ ] zoom doesn't change hectically (only at sentence boundaries, ≥ 2 s); crop doesn't jump between pause cuts
- [ ] dialogue not chopped (breathing pauses after sentence ends), seams on quiet spots
- [ ] a picture change every 2–4 s, no photo twice
- [ ] ends on the punchline, no CTA element

## 3. Fixing

Always fix findings in `work/edl.json`, then `npm run timeline` + render again. Never change `timeline.json` directly. If the error is in a component (affects every video) → skill `/new-component` or agent `motion-designer`, don't work around it per video.

Record recurring mistakes that a human corrected as a rule in CLAUDE.md → "Learnings from reviews".
