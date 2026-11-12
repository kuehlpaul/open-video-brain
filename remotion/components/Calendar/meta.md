# Calendar – year calendar with highlighted months

White card with the year and 12 month cells; the named months turn accent on their cue word (list = one box per item, active boxes in the accent color).

**Use when**
- A period within one year: launch, delivery start, funding period, order window ("in spring 2027" → `months: [3, 4, 5]`).
- `at` = cue on the time word ("spring", "from March") – until then the empty calendar shows; the accent `caption` arrives with the months.
- `at: -1` if the calendar continues across a cut and should already be highlighted.

**Don't use**
- For an exact date (→ Statement, e.g. "March 15").
- For periods spanning several years (→ List with years, or Flow).
- For unconfirmed dates without a source – the period must come from the script or a source.

**Props example**
```json
{ "year": 2027, "months": [3, 4, 5], "caption": "Launch in spring", "at": {"t": 281.9} }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 6 s
