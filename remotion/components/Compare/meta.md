# Compare – before → after (accent card)

Accent statement card: the old value struck through on the left, an arrow, the new value on the right.

**Use when**
- Something is replaced or renamed: product name, location, partner, old → new price.
- Without `above`/`below` = large variant (just two values). With small lines = column variant, e.g. `above: "before"/"now"`, `below: city/country`.
- `strikeF`: on the cue word ("… is replaced by …") the left side is struck through and the right side fades in. `-1` = final state from the start (e.g. when the card continues across a cut).
- `plain: true` = no accent card, free on the surface, vertical: old (struck through) on top, accent arrow pointing down, new below. The default for comparisons that are not the key message of the section.
- Keep values short (≤ about 12 characters) – they sit on one line.

**Don't use**
- For numeric comparisons with a gap/percentage (→ Delta) or several values (→ Bars, Columns).
- For a single statement without a "before" (→ Statement).

**Props example**
```json
{ "from": { "value": "Version 1" }, "to": { "value": "Version 2" }, "strikeF": {"t": 233.8} }
```
```json
{ "from": { "above": "before", "value": "Plant A", "below": "Country A" },
  "to": { "above": "now", "value": "Plant B", "below": "Country B" }, "strikeF": {"s": 1.0} }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 6 s
