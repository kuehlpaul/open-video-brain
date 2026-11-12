# Statement – key message, number or quote

The accent card is the strongest emphasis in the look. With `plain: true` the content sits free on the light surface, without a box – use that for single numbers and quotes.

**Two variants**
- **Card (default):** accent card, small line on top, large statement in white. The strongest emphasis in the look – only for the one key message of a section, at most a few per video.
- **`plain: true`:** free on the surface, no box and no badge (single-statement screen = no box). For neutral numbers, terms and quotes.

**Use when**
- Card: price, date, yes/no, a short takeaway that should stick ("from 2027", "under $22,500"). Keep `value` short (≤ about 14 characters = 190 px on one line; longer automatically becomes 120 px).
- plain, number: one number or term carries the message (price, range, speed, health score). `label` = gray intro above, `caption` = gray caption below, `sub` = accent punchline with its own cue, `accent: true` when the number is the good news.
- plain, quote: `value` in „…“ (the quote marks turn accent), `author` = "Name, role". Only verified quotes.
- `value` appears on the cue word (`f`), `caption`/`author` shortly after.

**Don't use**
- When `label`/`value` names a **concrete thing** ("power outlet", "laptop", "Model X"): that is a photo in the split (`Photo`, or `Video` with a `headline` for the one statement), not a text statement (skill `/visuals-plan`).
- For several values side by side (→ Tiles) or comparisons (→ Bars, Columns, Compare, Delta).
- For lists (→ List).
- With invented or rounded numbers – only values from the script or a source. Label spoken numbers correctly ("34 cents per kWh" spoken → show "$0.34/kWh").
- For unverified quotes – then rather no graphic at all.

**Props examples**
```json
{ "label": "Starting price", "value": "under $22,500", "f": {"t": 274.5} }
{ "plain": true, "label": "Customer satisfaction", "value": "93 %", "accent": true, "f": {"t": 11.8},
  "sub": { "f": {"t": 13.3}, "text": "a very good score" } }
{ "plain": true, "value": "„This is a verified quote.“", "author": "Name, role", "f": {"t": 402.0} }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 6 s
