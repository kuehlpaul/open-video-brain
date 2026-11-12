# Bars – horizontal bars free on the surface

A single-statement screen – no box. Minimum on-screen time 5 s: fade in early instead (labels + empty track via `fl`) and put the values on the number.

**Use when**
- Comparing 1–5 values of the same unit (count, price, range, share). Label on the left, value large on the right, the bar grows on its cue word (`f`).
- `fl`: the row (label + empty track) appears earlier, e.g. while the speaker introduces the topic – the value then lands on the number.
- `max` = value for a full bar (usually the largest value or a round upper limit).
- `tone: "muted"` for the comparison/old value, `"warn"` (red) only for real warnings.
- `footnote` for unit, source in the text or as-of date ("As of 2026").

**Don't use**
- For a single value without comparison (→ Statement) or a from–to progress (→ Meter).
- For price comparisons with few providers that should read as columns (→ Columns).
- With mixed units in one graphic.

**Props example**
```json
{ "rows": [
    { "fl": -1, "f": {"t": 451.2}, "label": "2025", "value": 50, "text": "50" },
    { "fl": -1, "f": {"t": 453.0}, "label": "2026", "value": 81, "text": "81" }
  ], "max": 100, "footnote": "Active users per 100 visitors (example)" }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 7 s
