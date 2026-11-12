---
name: voice-insert
description: Generate spoken passages with the ElevenLabs voice clone and place them in the edit – e.g. narration over a graphic or B-roll. Use for [VOICE …] in the script.
---

# Voice insert

## When

- Over fullscreen graphics or `Video` B-roll when nothing was filmed for them.
- **Never** over the speaker's face (no lip sync).
- **Never** without `consent: true` for the voice in `brand/voices.json`. If it's missing: stop, don't work around it.

## Writing the text

- The way the person talks, not the way people write: short sentences, the same tone and form of address as the rest of the video.
- Write numbers the way they should be spoken when the pronunciation is ambiguous ("four hundred and thirty-four kilometers").
- One insert = one thought, 1–3 sentences (~2.5 words per second).
- Voice = the speaker of the video (`project.json` → `speaker`), not the editor.

## EDL

```json
"voiceInserts": [{ "id": "pickup-vienna", "voice": "host", "text": "We picked it up in Vienna." }],
"sequence": [ …, { "type": "voice", "id": "pickup", "voiceInsert": "pickup-vienna",
  "visual": { "component": "Flow", "props": { "heading": "Pickup",
    "nodes": [ { "title": "Munich", "sub": "Start" }, { "title": "Vienna", "sub": "Pickup" } ],
    "steps": [ { "f": -1, "i": 0 }, { "f": { "s": 0.8 }, "i": 1 } ] } } }, … ]
```

Cues in the `visual` of a voice segment: `{ "s": seconds from segment start }` (there is no source time). Words with timing are in `work/voice/manifest.json` after `npm run voice`.

The final render normalizes loudness (−14 LUFS). Captions and the .srt get the words of the insert automatically.

## Generating

```bash
npm run voice -- <slug>
```

Cached by text + voice + model. Then check:
- Plausible duration (words ÷ 2.5 ≈ seconds)? Much longer → pauses/errors, simplify the text.
- `work/voice/manifest.json` → do the `words` match the text?
- Have a human listen in the draft if one is available; otherwise mark it as "please listen" in the report.
