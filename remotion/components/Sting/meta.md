# Sting – short logo sting

Accent logo on #FCFCFD, animated as a "mark drop": the logo mark drops large and rotated into the center and springs in (f0–8), an accent ring expands as a shock wave (f6–20), the mark glides to its place in the logo and the wordmark wipes in behind it (f10–30), then a hold with a slight push (1 → 1.03). Uses only the logo files from brand/logos and `C.brand`.

**Use when**
- In longform as a short brand moment AFTER the hook (e.g. between the hook and the first chapter), ≈ 3 s, without a hit (music bed only).
- Optionally as the last seconds before the EndCard.

**Don't use**
- When `brand/brand.json` → `logo.sting` is `false` (brand without a logo, or its own logo – the animation is built for the placeholder's mark + wordmark). `npm run timeline` warns.
- As the very first image – the first 3–5 s are content (hook first).
- As an intro in Shorts (no intro logo in a Short). At most at the very end of a Short.
- More than once per video.

**Props example**
```json
{}
```
No props, no cues. No hit on the sting – the music bed carries it.

**Layouts:** full (3840×2160) · **9:16:** native, resolution-independent (logo = 51 % of the shorter frame side) · **Duration:** ≥ 1.2 s, default 2 s
