# Tiles – tiles side by side

Rule: lists = one box per item, the highlighted box is in the accent color.

**Use when**
- 2 (up to 4) short values compared side by side: storage sizes, variants, price A vs. price B. Each tile appears on its cue word (`f`) and pushes the row towards the center.
- `accent: true` for the tile currently being discussed (exactly one).
- Keep `big` short (≤ 9 characters, e.g. "128 GB"), `small` = explanation in 1–3 words.
- **Space:** split and 9:16 at most 2 tiles in a row (860 px wide each), full frame up to 4.
- `grid: true` = 2×2 grid (900×480 px each, 64 px gap) for 3–4 tiles – fits in the split and looks calmer than a long row.

**Don't use**
- Tiles with **concrete things** ("laptop", "camera") don't replace a photo: show things, don't label them (skill `/visuals-plan`).
- For a single value (→ Statement).
- For longer texts per point (→ List) or collections of terms (→ Words).
- For quantity comparisons where the size should be visible (→ Bars, Columns).

**Props example**
```json
{ "tiles": [
    { "f": {"t": 612.0}, "big": "128 GB", "small": "base model", "accent": true },
    { "f": {"t": 614.2}, "big": "256 GB", "small": "pro model" }
  ] }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default, max. 2 tiles, up to 4 with `grid`), full (up to 4) · **9:16:** stage (max. 2) · **Duration:** ≥ 5 s, default 6 s
