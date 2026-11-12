# Video – full-surface B-roll clip

**Rules:** no chips or boxes on moving footage, source credits only on photos/clips (white), media at least 5 s on screen.

**Use when**
- B-roll that shows what is being said: a product in use, a location, an interior, a manufacturer clip. Audio is always muted (the speaker keeps running).
- `from` = start second in the clip (the pipeline converts it to frames).
- A slight Ken Burns (100 → 104 %) is the default. `zoomTo` for a deliberate, slow zoom (e.g. `zoom: 1`, `zoomTo: 1.15`, zoom point `zx`/`zy`).
- If the same clip continues across several entries: `kenBurns: false` (or continue `zoom`/`zoomTo` from where it left off), otherwise the zoom jumps at the cut.
- `fx`/`fy` shift the crop when the aspect ratio doesn't match (the split panel is almost square).
- Set `source` for third-party clips.
- `frame: "monitor"` for excerpts from other YouTube videos (e.g. announcing your own series): the clip plays in a screen mockup with a progress bar on a light surface, so it's clear the video itself is the topic. No Ken Burns, gray credit bottom left.

**Don't use**
- Over the speaker's face with voice-clone audio (lip-sync rule).

**Props example**
```json
{ "src": "_library/broll/city-night-drone.mp4", "from": 12.5, "zoom": 1, "zoomTo": 1.12, "zx": 0.5, "zy": 0.4 }
```
No cues – the clip runs from the graphic start.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 6 s

**Headline (`headline`)**
- If a Short only shows a single fact on top (a number, a short statement), it goes large as a `headline` on a matching image instead of a standalone `Statement` card – that looked empty in the 9:16 split.
- `{ "label": "Goal for 2027", "value": "1 million users", "caption": "…", "f": {"t": 690.1} }` – white, bottom left on the gradient, no box. `accent: true` for good news.
- Only one fact per image. Lists stay `List`/`Tiles`/`Words`.
