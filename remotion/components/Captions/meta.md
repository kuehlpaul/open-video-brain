# Captions – subtitles (karaoke for Shorts, calm line for longform)

Short style: Inter Bold 62 px, active word 71 px, white glow 35 % / 28 px, y = 0.68, max. 13 characters per line, single words up to 20, otherwise hyphenated, no animation. Values in `brand/brand.json` → `captions.short`. Longform style: one calm line at the bottom center, white on a dark box.

**Use when**
- Required in Shorts: `style: "short"`. Usually not set by hand – the timeline generates the tokens from the transcript (`captions` in edl.json).
- Longform only when explicitly requested (`style: "longform"`); otherwise YouTube captions come as an .srt.
- Words appear page by page: one line per page, break when the line gets too long, after the end of a sentence or after a speaking pause (short ≥ 0.5 s, longform ≥ 0.7 s). In Shorts the word currently being spoken is larger.
- Line-break rules are tuned for German: numbers stay on one line with their unit (unit list in `pages.ts`), long words are hyphenated after a vowel. Extend `UNIT_RE` in `pages.ts` for other languages.

**Don't use**
- Twice (burned-in captions AND overlay texts with the same sentence).
- Over graphics whose content sits in the caption zone (y ≈ 0.62–0.74 in Shorts).

**Props example**
```json
{ "style": "short", "tokens": [
    { "text": "What", "startMs": 0, "endMs": 320, "timestampMs": null, "confidence": null },
    { "text": " makes", "startMs": 320, "endMs": 700, "timestampMs": null, "confidence": null },
    { "text": " a", "startMs": 700, "endMs": 850, "timestampMs": null, "confidence": null }
  ] }
```
Tokens in the Remotion caption format: text with a leading space (the first word without), `startMs`/`endMs` relative to the graphic start (for captions spanning the whole video = video time), `timestampMs` and `confidence` null.

**Position:** short centered at 68 % of the height, font scales with the shorter frame side (62 px at 1080). Longform at the bottom center, 72 px above the edge (1080p grid), 40 px font.

**Layouts:** overlay (3840×2160, transparent) · **9:16:** overlay (2160×3840) · **Duration:** the whole video (default 10 s only as a placeholder)
