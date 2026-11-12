# Words – term chips

One chip per term. Rule: lists = one box per item, highlight in the accent color.

**Use when**
- Many short terms that together form a picture: providers, apps, plans, brands, keywords ("There are so many subscription services …"). The chips pop up one after another (`f`), the cloud stays centered.
- `accent: true` for the term the speaker is getting at (usually the last one).
- The chips sit at their final position from the start (invisible) – so the cloud doesn't jump when new ones appear.

**Don't use**
- Term chips for **concrete things** don't replace a photo – only for abstract terms (skill `/visuals-plan`).
- For 2–6 points with explanations (→ List) or values (→ Tiles).
- As labels on photos – no chips on photos.
- As an accent eyebrow badge above other graphics.

**Props example**
```json
{ "chips": [
    { "f": {"t": 702.1}, "text": "Provider A" },
    { "f": {"t": 702.6}, "text": "Provider B" },
    { "f": {"t": 703.0}, "text": "Provider C" },
    { "f": {"t": 705.4}, "text": "one app for everything?", "accent": true }
  ] }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 7 s
