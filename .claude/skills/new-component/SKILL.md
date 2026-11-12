---
name: new-component
description: Build a new graphic component in the house style (e.g. a new graphic type a video needs) – with def.ts (schema, meta, sample), the component and meta.md. Use when a video needs a graphic that doesn't exist in remotion/components/CATALOG.md yet.
---

# New graphic component

New components are brand work: afterwards they are available to every video. First check whether an existing component with different props does the job (CATALOG.md). If a human is available, have the idea confirmed briefly.

Remotion details: the `remotion-best-practices` skill, if installed (optional: `npx skills add remotion-dev/skills --skill remotion-best-practices`). Reference for structure and style: `remotion/components/List/`.

## Files

```
remotion/components/<Name>/
├── def.ts       schema (zod), meta (ComponentMeta), sample – import ONLY zod + types (node-safe)
├── <Name>.tsx   export const <Name>: React.FC<Props>
└── meta.md      origin, when to use, when not to use, props example with cues, layouts, 9:16, duration
```

Then `npm run gen` – registers the component and updates CATALOG.md.

## Rules

- **Design pixels:** the component is built in the 4K grid. `useVideoConfig()` returns the design area (panel 2228×2160, fullscreen 3840×2160, stage 2160×2180, overlay 3840×2160 / 2160×3840). If both split AND full are allowed: derive sizes from width/height.
- **Only `remotion/look`:** colors `C`/`S`, `BAR`, `STAGE`, `SHADOW_CARD`, type `t()`/`txt()`/`head()`, motion `useIn`, `rise`, `useKenBurns`, layout `Stage`, `Grow`, `Shell`, `boxStyle`, `Source`, `Icon`, `IconSquare`. No hex values of your own, no other fonts. Colors come from `brand/brand.json`.
- **House-style rules:** enumeration = one box per element, active box in the accent color (`boxStyle(on)`), no outer frame around the group; a single statement sits freely on the surface. No eyebrow badges. Source credits only on photos.
- **Cues:** props for appearance times are numbers (frames from graphic start, `f < 0` = immediately). In the schema `z.number().describe(...)`.
- **Media:** props `src`, render with `media(src)` (never `staticFile` directly).
- **Parse props:** `const p = schema.parse(raw)` at the top of the component (defaults).
- **Texts** have maximum lengths in the schema.
- **meta:** `layouts` (first = default), `portrait` (`stage`/`native`/`overlay`/false), `seconds`, `minSeconds` (media ≥ 5), `group`.

## Check

```bash
npm run gen && npm run typecheck
npm run catalog -- <Name>          # → brand/catalog/<Name>-16x9.png / -9x16.png
```

Look at the PNGs (Read tool) and compare them with 2–3 existing catalog images: same scale of type, same margins, same colors. Check the animation in the studio (`npm run studio` → catalog). Then commit.
