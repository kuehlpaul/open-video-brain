# EndCard – YouTube end screen

Light surface #FCFCFD without gradient, small accent logo, heading in Inter 600, dashed gray zones for the end-screen videos, and a round subscribe circle with the channel avatar (`brand:channel-avatar`).

**Use when**
- Required in longform: exactly once at the very end, 12–20 s (YouTube allows 5–20 s). Music/outro underneath, no speaker.
- In YouTube Studio, place the end-screen elements exactly on the zones (values below). The labels in the zones are then covered.

**Don't use**
- In Shorts (Shorts have no end screen).
- In the middle of a video.

**Props example**
```json
{ "title": "Thanks for watching!", "videoLabels": ["Next video", "Recommended video"], "subscribeLabel": "Subscribe" }
```
No cues – logo, heading and zones rise in one after another during the first ~1.3 s.

**Zones for YouTube Studio** (percent of frame width/height, left/top = top-left corner):

| Element | left | top | width | height |
|---|---|---|---|---|
| Video 1 (16:9) | 14.58 % | 29.63 % | 33.33 % | 33.33 % |
| Video 2 (16:9) | 52.08 % | 29.63 % | 33.33 % | 33.33 % |
| Subscribe circle | 44.79 % | 67.59 % | 10.42 % | 18.52 % |

Subscribe circle: center 50 % / 76.85 %, diameter 10.42 % of the width (= 18.52 % of the height). On the 3840×2160 grid: videos 1280×720 at (560, 640) and (2000, 640), circle Ø 400 around (1920, 1660).

**Layouts:** full (3840×2160) · **9:16:** not for Shorts · **Duration:** ≥ 12 s, default 15 s
