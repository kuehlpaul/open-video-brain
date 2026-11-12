# Sounds

This folder starts empty. Drop in your own sound effects as `.mp3` or `.wav`; the file name without extension is the name you use under `"sfx"` in `edl.json` (`click.mp3` → `"click"`). Nothing has to be registered – the next render picks them up.

A sound that is missing is skipped: `npm run timeline` warns, the video renders without it.

## Names the pipeline and the house style use

| Name | Use | What it should sound like | Length |
|---|---|---|---|
| whoosh_in | 15 f before speaker → split/fullscreen (set automatically) | soft, airy whoosh | ~1.8 s |
| whoosh_out | ends on split/fullscreen → speaker (set automatically) | subtle low whoosh | ~1.7 s |
| click | list items, enumerations; `SubscribeButton` | single soft mouse click, dry | ~0.5 s |
| chapter_impact | on a chapter start | soft shimmering hit, not loud | ~2 s |
| punchline_impact | on the punchline (max. once per video) | deep cinematic impact, short tail | ~2.5 s |
| outro_hit | last hit before the end card | clean rumble whoosh hit | ~2 s |
| tension | bed under dramatic passages (music down) | low drone, subtle pulse, loopable | ~20 s |
| chapter_riser | before a chapter start (`endsAt`) | short dark riser | ~2 s |
| power_riser | before a punchline (`endsAt`) | rising build into a hit | ~4 s |
| brand_riser | before the brand name (`endsAt`) | bright, airy lift | ~3 s |
| brand_hit | on the brand name | bright, positive whoosh hit | ~3 s |
| jingle | intro/sting | short logo jingle, no vocals | ~8 s |
| pop_soft | Shorts: list items | soft UI pop | ~0.5 s |
| sub_hit | Shorts: hook | deep sub-bass hit | ~1.2 s |
| swoosh_fast | Shorts: changes | fast whip-pan swoosh | ~0.6 s |

You can add more under any name. The house style keeps risers out from under speech (see CLAUDE.md → "Sound").

## Where to get sounds

- Your own recordings or a sound library you have a license for.
- `npm run sounds -- <slug> --query "soft whoosh"` searches freely licensed sounds (Openverse, Freesound) and stores the license next to each file. Copy a find that should become part of the brand into this folder.
- `npm run generate -- <slug> --type audio` generates one (billed by the provider; check its terms for commercial use).

Music beds go in `projects/_library/music/`.
