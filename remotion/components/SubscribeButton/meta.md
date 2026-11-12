# SubscribeButton – subscribe reminder with click

White card in chip style: the channel's YouTube profile picture (`brand:channel-avatar`), channel name, accent "Subscribe" pill. A mouse pointer moves in and clicks – the pill turns gray "Subscribed" with a check mark, the bell appears, gets clicked, swings out and turns accent. Both clicks with `sfx.click` (volume 0.35).

**Use when**
- Required in longform: exactly once, after the first real value (typically 1–3 min in), when the speaker reminds viewers to subscribe – otherwise silently during a calm speaking passage.
- `clickF` on "subscribe", `bellF` on "bell" (if said); otherwise defaults (frames 42 / 63 = 1.4 s / 2.1 s at 30 fps; set `{"s": …}` cues for other frame rates).
- `sound: false` if another sound already sits at that spot.

**Don't use**
- In Shorts (no subscribe button in a Short).
- At the same time as another overlay.
- At the end of the video – the EndCard has the subscribe circle there.

**Props example**
```json
{ "channel": "Your Channel", "sub": "Videos about your topic.", "clickF": {"s": 1.4}, "bellF": {"s": 2.1} }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number. `bellF` is at least 12 frames after `clickF`; the cursor appears ~24 frames before `clickF`.

**Position:** bottom left (1080p grid: 96 px from the left, 112 px from the bottom edge).

**Layouts:** overlay (3840×2160, transparent) · **9:16:** not for Shorts · **Duration:** ≥ 3.5 s, default 4 s
