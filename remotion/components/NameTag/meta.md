# NameTag – the person's name

Deliberately minimal: just the name in Inter 700, white, free on the image. No box, no icon, no badge, no role. A soft dark text shadow keeps it legible on light backgrounds, no background fill.

**Use when**
- On the first appearance of every person who speaks on camera (interviews, team videos, guests), shortly after their first word, for about 4 s.
- `name` as the person wants to be called: full name or first name only. Important: only names from the footage or from an agreement, never guess. Unclear spelling → ask in the report.
- Sits only on top of the speaker shot (speaker state, no split/full-frame graphic).

**Don't use**
- A second time for the same person in the same video.
- At the same time as another overlay (SubscribeButton …) or on top of split/full-frame graphics.
- For roles, places, topics or products (use Statement for those).
- With voice-clone audio (the name belongs to the face that is speaking).

**Props example**
```json
{ "name": "Jane Doe" }
```
No cues: rises in at the graphic start (12 frames) and fades out during the last 10 frames. Start via `at` in the EDL ≈ 0.5 s after the first word.

**Position:** 16:9 bottom left (1080p grid: 96 px from the left, 104 px from the bottom edge), font 52 px. 9:16 left 64 px, bottom edge at 62 % of the height (above the captions at 68 %).

**Layouts:** overlay (3840×2160, transparent) · **9:16:** overlay (2160×3840) · **Duration:** ≥ 3 s, default 4 s
