# Fonts

This folder starts empty. Drop in your font files (`.woff2`, `.woff`, `.ttf`, `.otf`) and set the family name in `brand/brand.json` → `typography.family`. Every file here is loaded under that family; no code change needed.

Weight and style come from the file name:

| File name contains | Loaded as |
|---|---|
| `Variable`, `VF`, `[wght]`, `wght` | all weights (100–900) |
| `Thin`, `ExtraLight`, `Light`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`, `Black` | 100, 200, 300, 500, 600, 700, 800, 900 |
| nothing of the above | 400 |
| `Italic` | italic |

The components use weights 500, 600 and 700 – a variable font or those three files cover everything.

Without files here, the family is used if it is installed on the rendering machine, otherwise a system font. Check the license of your font before you commit it to a public repo.
