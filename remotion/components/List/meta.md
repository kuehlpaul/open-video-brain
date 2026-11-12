# List – items in boxes

Rule: lists = one box per item, the active box is in the accent color.

**Use when**
- The speaker lists 2–6 points (topic overview, steps, pros/cons). Each box appears on its cue word (`f` = cue).
- **The topic overview of an episode is always `numbered: true`** (number in a circle on the left, active box in the accent color).
- `numbered: true` also for sequences/rankings, `arrows: true` for processes from top to bottom.
- `value` for numbers per row (e.g. prices per provider) – the value sits on the right in the accent color.
- `focus`: when the speaker returns to a point later, switch it to accent.

**Don't use**
- Lists of **concrete things** without explanatory text ("laptop · camera · microphone") are photos one after another in the split, not a `List` (skill `/visuals-plan`). Use `List` only when every point carries explanatory text or the points are abstract.
- For a single statement (→ Statement).

**Props example**
```json
{ "items": [
    { "f": {"t": 451.2}, "title": "New partnership", "sub": "two companies merge their networks" },
    { "f": {"t": 455.8}, "title": "Product launch delayed" }
  ], "numbered": true }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 7 s
