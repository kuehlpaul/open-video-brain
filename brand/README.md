# brand/ – the look and sound of every video

The example brand ("Example Brand", channel "Your Channel"; the placeholder logo reads "Your Brand"): light surfaces, one accent color (blue #1570EF), typeface set in `brand.json` (`typography.family`). Fonts and sounds are not included – you bring your own. Components in `remotion/components/` read only from here (via `remotion/look/`). Change something here and you change every future video.

| File | Contents |
|---|---|
| `brand.json` | colors, look values (surface, border, shadows, gradients), design grid, split layout, zoom/pause rules, caption style, sound levels, loudness |
| `tokens.ts` | makes brand.json typed |
| `logos/` | placeholder logo, mark and wordmark, each in `accent`, `white`, `dark` (SVG), plus `channel-avatar.svg` |
| `fonts/` | **empty** – your font files (`.woff2`, `.woff`, `.ttf`, `.otf`), loaded automatically under `typography.family` |
| `media/sample-photo.jpg` | placeholder photo (gradient), usable as `brand:sample-photo` |
| `data/concrete-terms.json` | photographable things; `npm run timeline` warns when a text graphic names one and no `visuals.json` exists |
| `sfx/` | **empty** – your sound effects (`.mp3`/`.wav`), file name = name in `edl.json`; expected names in `sfx/README.md` |
| `voices.json` | speaker → ElevenLabs voice ID + consent |
| `catalog/` | stills of all components (`npm run catalog`, generated, not in git) |

Brand media in props: `brand:sample-photo`, `brand:channel-avatar`, `brand:logo-accent|white|dark`, `brand:mark-accent|white|dark`, `brand:wordmark-accent|white|dark`.

## Rules the system enforces

- Design grid 3840×2160 (panel 2228×2160, portrait 2160×3840), rendered at 1080p.
- Split: panel left 58 %, speaker right (image center at 0.782).
- Speaker zoom: WIDE 1.0 / PUNCH 1.15 (centerY 0.575); Shorts 1.0 / 1.2 / 1.4 with a push of 1.2 %/s.
- Pauses > 0.4 s are tightened to a 0.08 s margin (Shorts > 0.25 s).
- Whoosh in/out at −25 dB on every split/fullscreen change (once `sfx/whoosh_in` and `sfx/whoosh_out` exist).
- Loudness of the finished video: −14 LUFS / −1.5 dBTP.

## Applying your own brand

The basics in one go: `/welcome` in Claude Code, or directly

```bash
npm run brand -- --name "My Channel" --language de --accent "#E8590C" --logo ~/logo.svg --avatar ~/profile.jpg --font "Manrope" --font-files ~/Downloads/Manrope/
```

The accent becomes `look.brand` plus the `colors.primary` scale (25–900) and the gradients. A PNG/JPG logo or avatar is embedded in the SVG file. `--no-logo` leaves the logo out (`logo.enabled: false`): the end card shows none and the `Sting` is not used. With your own logo the `Sting` is switched off as well (`logo.sting: false`), since it is built for the placeholder's mark + wordmark. `--dry-run` shows the changes first. By hand:

1. Put your SVGs into `logos/` and **keep the file names**. The end card fits any aspect ratio into the logo box; the `Sting` animation is built for the placeholder's geometry (constants at the top of `remotion/components/Sting/Sting.tsx`), so switch it off (`logo.sting: false`) or adapt those.
2. Colors in `brand.json` (`colors` and `look`; the accent is `look.brand`).
3. Typeface: put your font files into `fonts/` and set `typography.family`. Weight and style come from the file name (`-Variable`/`[wght]` = all weights, `-Medium` = 500, `-SemiBold` = 600, `-Bold` = 700, `Italic` = italic). Without files the family is used if it is installed on the system, otherwise a system font.
4. Sounds: put your files into `sfx/` under the names in `sfx/README.md`. Missing sounds are skipped (`npm run timeline` warns).
5. Replace `media/sample-photo.jpg` and the channel avatar.
6. Run `npm run catalog` and look at the PNGs.

Note: `Captions` copies the values from `captions.short` as constants – update it when you change them there.
