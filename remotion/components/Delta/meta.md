# Delta – gap between two values

White card: starting and comparison value on top, a large accent number counts up, optional accent pill for context.

**Use when**
- The speaker names the difference between two values: price increase, savings, loss ("61 percent more expensive").
- `delta` = the number (without sign), `prefix` = sign (`"+"`, `"−"`), `suffix` = unit (`" %"`, `" $"`, `" km"`). `decimals` for decimal places (formatted with a decimal comma, `de-DE` locale).
- `countF` = cue on the number; it counts up from 0 over 20 frames.
- `pill` = accent context line with its own cue ("for no good reason") – only if the speaker says so.
- **Don't calculate the gap yourself** if it isn't in the script/source – otherwise double-check it and note it in the report.

**Don't use**
- For before → after without a number (→ Compare) or several values (→ Bars, Columns).
- For a single number (→ Statement).

**Props example**
```json
{ "from": { "label": "basic plan", "value": "$9.99" }, "to": { "label": "premium plan", "value": "$15.99" },
  "delta": 60, "prefix": "+", "suffix": " %", "countF": {"t": 931.4},
  "pill": { "f": {"t": 934.0}, "text": "for no good reason" } }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 7 s
