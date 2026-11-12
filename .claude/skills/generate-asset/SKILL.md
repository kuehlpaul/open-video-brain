---
name: generate-asset
description: Generate an image, a short video or a sound effect with AI (fal.ai, Black Forest Labs, Higgsfield, Atlas Cloud, ElevenLabs) when no footage, B-roll or sound exists for a spot – e.g. a background, a mood shot, a transition, a foley sound. Costs money per generation.
---

# Generating an asset

## Check first

1. Is there something in `projects/_library/` (broll, images)? → use that.
2. Does a brand component do the job (Statement, Words, Placeholder – see `remotion/components/CATALOG.md`)? → use that.
3. Only if both are no and the spot matters: generate. Video generation is the most expensive step of the pipeline.

## Command

```bash
npm run generate -- --providers        # which providers have a key, default models
npm run generate -- <slug> --type image --prompt "<prompt>" --name <name> [--provider bfl]
npm run generate -- <slug> --type video --prompt "<prompt>" --name <name> [--provider higgsfield|atlas|fal] [--image work/assets/<image>.jpg]
npm run generate -- <slug> --type audio --prompt "<sound>" --name <name> [--seconds 3] [--loop]
```

| Provider | Can do | Good for |
|---|---|---|
| `fal` (default image/video) | image, video, audio | one key, many models (Flux, Kling, Veo, Seedance …) |
| `bfl` | image | Black Forest Labs FLUX directly (`flux-2-pro` default, `flux-2-max`, `flux-pro-1.1-ultra`, `flux-kontext-pro` for edits with `--image`) – photoreal stills |
| `higgsfield` | image, video | cinematic camera moves (Kling, Seedance, Wan …); image: SOUL |
| `atlas` | image, video | Atlas Cloud, many video models behind one key, often cheap |
| `elevenlabs` (default audio) | audio | sound effects 0.5–30 s, `--loop` for beds |

Model from `.env` (`<PROVIDER>_IMAGE_MODEL` / `_VIDEO_MODEL` / `_AUDIO_MODEL`, default provider `GEN_PROVIDER`) or `--model <id>` (Higgsfield: the model path from docs.higgsfield.ai, Atlas: the model ID from its model page). Field names differ per model – model-specific parameters go into `--input '{"duration":5}'` and override the defaults. The aspect ratio follows the project (16:9 / 9:16), override with `--aspect`. A local `--image` is uploaded automatically (Higgsfield, Atlas) or sent inline (fal, BFL).

Comparing looks: generate the same prompt with two providers (`--name skyline-bfl`, `--name skyline-fal`) and pick – but every run costs money, so at most two variants without asking.

Result: `work/assets/<name>.<ext>` + `<name>.json` (provider, model, prompt). In the EDL as `src` of a media component: `Video` for clips and stills (`"src": "work/assets/<name>.mp4"`). Generated images get **no** source line that suggests a real author.

Sound effects: first try `npm run sounds -- <slug> --query "…"` (free, licensed finds). A sound that should become part of the brand goes to `brand/sfx/` under a new name (see its README).

## Prompts

- Concrete and cinematic: subject, perspective, light, motion ("drone flight over a city park at dusk, slow forward move, cool light, realistic").
- **No** logos, lettering, brand names, recognizable real people or license plates in the prompt.
- Describe products generically ("a compact white hatchback"); never pass off specific real models as genuine.
- For video: generate a still first, then animate it (`--image`) – cheaper to iterate.

## Reuse

Copy good results to `projects/_library/broll/` or `images/`, with a descriptive file name and the `.json` next to it.
