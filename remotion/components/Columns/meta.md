# Columns – columns on a white card

2–5 columns. The value sits above the column and arrives with it, the label below; the color gets stronger from left to right (light accent → full accent).

**Use when**
- 2–5 values of the same unit, told in ascending order – typically prices per provider or plan ("the basic plan … standard … premium"). Each column grows on its cue word (`f`).
- Order them so the most important (usually the highest) value is on the right – it gets the strongest color.
- Leave `max` empty (= largest value) or set a round upper limit if several Columns graphics should be comparable.
- Keep labels short: ≤ about 10 characters with 4–5 columns.

**Don't use**
- For values with long labels or more than 5 entries (→ Bars, horizontal).
- For the gap between two values as a percentage (→ Delta).
- For values without a source – prices always with an as-of date/source in the script.

**Props example**
```json
{ "bars": [
    { "label": "Basic", "value": 9.99, "text": "$9.99", "f": {"t": 880.1} },
    { "label": "Standard", "value": 14.99, "text": "$14.99", "f": {"t": 883.4} },
    { "label": "Premium", "value": 19.99, "text": "$19.99", "f": {"t": 887.0} }
  ] }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 7 s
