# Photo – full-surface photo

For real photos (press images, Wikimedia Commons, Pexels) from `work/visuals.json` – the photo/video/graphic decision is made in the skill `/visuals-plan`. Always in the split, credit on the photo, `fx`/`fy` on the subject. `Photo` does not support a `headline` (number/statement on the photo) yet – only `Video` does; see `/visuals-plan`.

**Rules:** no chips or boxes on photos, source credits only on photos, media at least 5 s on screen.

**Use when**
- Press photo, product shot, person, place – anything that shows what is being said. The image fills the surface, a slow Ken Burns (100 → 104 %) keeps it alive.
- `fx`/`fy` = the image point (0–1) that sits in the center of the surface (e.g. a face, a product). It is clamped at the image edges automatically – there is never a border.
- `zoom` for a tighter crop (e.g. one person from a group photo: `zoom: 1.8`).
- `contain: true` for data sheets, charts, logos or screenshots that must be fully legible – then white background, `pad` = padding, gray credit.
- Always set `source` for third-party photos (credit from the download manifest).
- `iw`/`ih` are filled in by the pipeline (image size). Without them, the image is cropped with object-fit: cover.

**Don't use**
- For numbers, quotes or lists (→ Statement, List) – no text overlays on photos.
- For moving footage (→ Video).

**Props example**
```json
{ "src": "_library/images/example-product.jpg", "fx": 0.45, "fy": 0.55, "zoom": 1.2, "source": "Photo: manufacturer" }
```
No cues – the photo is visible from the graphic start. To cut on a cue word: two Photo entries back to back in the EDL.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 6 s
