# Meter – fill level from–to

White card: a large line, below it a track that fills from `from` to `to`, gray caption.

**Use when**
- Battery level, share, progress, completion – anything that can be shown as a section of a 0–100 % track ("from 10 to 80 percent in 18 minutes").
- `from`/`to` = percent of the track (range 10–80 → `from: 10`, `to: 80`; share 35 % → `from: 0`, `to: 35`).
- `big` = the number as it is spoken; `caption` = context (time, condition).
- `f` = cue from which the bar fills (over 30 frames).
- `plain: true` – the meter sits free on the surface without a box (single statement).

**Don't use**
- For several values in comparison (→ Bars).
- For absolute quantities without a relation to 100 % (→ Statement).

**Props example**
```json
{ "big": "10–80 %", "from": 10, "to": 80, "f": {"t": 377.2}, "caption": "in under 20 minutes" }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 6 s
