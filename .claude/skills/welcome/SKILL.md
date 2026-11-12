---
name: welcome
description: Onboarding for new users – make the brand your own (channel name, language, accent color, logo, avatar, font) and create the first project. Use on /welcome, when someone is new to the repo, or when brand/brand.json still says "Example Brand".
---

# Welcome

Guide a new user from a fresh clone to their own brand and a first project. Talk in the user's language, keep each step short, ask one topic at a time. Use AskUserQuestion where there are clear options; ask in plain text for names, paths and hex values.

**You decide, the script executes:** collect the answers, then write everything with **one** `npm run brand -- …` call. Never edit `brand/brand.json`, `brand/logos/` or `brand/fonts/` by hand in this flow.

At the start, create a task list with the steps below.

## 1. Check the machine

- `node_modules/` missing → stop: "Run `bash setup.sh` first, then `/welcome` again."
- Run `npm run doctor`. Pass on only what matters: missing tools and missing **required** keys (`ELEVENLABS_API_KEY`). Optional keys go into the wrap-up. Never read, print or ask for the contents of `.env`. The user enters keys there themselves.

## 2. Starting point

Read `brand/brand.json`.
- `name` is `"Example Brand"` → full flow.
- Already set up → show the current values (channel, language, accent, logo on/off, font) and ask which part should change. Run only those steps.

## 3. Channel

- **Channel name**: as it appears on YouTube (max. 24 characters, it appears in the SubscribeButton).
- **Language of the videos** as a code (`de`, `en`, `es` …). It becomes the default for new projects and the captions.

## 4. Accent color

The one accent color of all graphics (active boxes, bars, statement card). Options:
- the user gives a hex value,
- "take it from my logo": SVG → read the `fill`/`stroke` colors, suggest the most prominent non-gray one. Raster → look at the image (Read) and suggest one.
- keep the example blue `#1570EF`.

Confirm before you move on. Warn if the color is very light (white text on it becomes unreadable) and suggest a darker shade.

## 5. Logo

Ask for the path to the logo file: SVG preferred, PNG works. Optionally ask for a white version for dark backgrounds.
- **No logo** → `--no-logo`. Say briefly what that means: the end card shows no logo, and the logo sting is not used. No placeholder is generated.
- **Own logo** → `--logo <file>` (`--logo-white <file>`). Note: the `Sting` logo animation is built for the placeholder logo and gets switched off. A sting for their logo can be built later with `/new-component`.

## 6. Avatar

The YouTube profile picture (square image, PNG/JPG/SVG) → `--avatar <file>`. The end card and the SubscribeButton show it as a circle. Without an image, the script draws the channel's initial on an accent circle, the way YouTube does.

## 7. Font

- Keep the default (`Inter`, or a system font if it is not installed), or
- their own font: family name + folder or files → `--font "<Family>" --font-files <dir>`. The components need weights 500, 600 and 700, and a variable font covers all of them. Mention the licence note in `brand/fonts/README.md` (no commercial fonts in a public repo without a licence).

## 8. Apply

1. Build the call from the answers. Pass only what is being changed:
   ```bash
   npm run brand -- --name "<channel>" --language <code> --accent "#RRGGBB" [--logo <file> [--logo-white <file>] | --no-logo] [--avatar <file>] [--font "<Family>" --font-files <dir>] --dry-run
   ```
   Paths with spaces in quotes, `~` works.
2. Show the dry-run output and ask "Apply it like this?"
3. Run the same call without `--dry-run`. If an error comes up (file not found, not an image), fix the path with the user and repeat.

## 9. Look at it

```bash
npm run catalog -- EndCard
npm run catalog -- SubscribeButton
npm run catalog -- Statement
npm run catalog -- List
```
Read the PNGs from `brand/catalog/` and show what you see: accent, channel name, logo/avatar, font. Ask whether it fits. If not, adjust (e.g. `npm run brand -- --accent "#…"`) and render again. The first catalog run bundles Remotion and takes a while, so say so.

## 10. First project

- Ask for the title of the first video and the format: longform (16:9) or Short (9:16).
- Suggest a slug: `YYYY-MM-<topic-in-a-few-words>` (lower case, hyphens, today's date).
- `npm run new -- <slug> --title "<title>" [--format short]`. The language comes from the brand automatically.
- Then explain, using the paths the command printed:
  1. Copy the footage into `input/footage/`, unchanged from the camera.
  2. Put the script in `input/script.md` (conventions: `projects/_template/input/script.md`).
  3. Then `/produce-video <slug>`.

If the user has no video yet: offer the demo instead (`npm run timeline -- _demo && npm run render -- _demo --draft`), which renders in the new brand without API keys.

## 11. Wrap-up

A short message with:
- **Set up:** channel, language, accent, logo (or none), avatar, font, project slug.
- **Still open** (only what applies):
  - API keys that doctor reported as missing, and what each is for. The user enters them in `.env` themselves.
  - `brand/sfx/` is empty: whooshes, clicks and impacts are skipped. Names and sources are in `brand/sfx/README.md`. `npm run sounds -- <slug> --query "soft whoosh"` searches for freely licensed ones.
  - Voice inserts need a voice clone with consent in `brand/voices.json` (`/voice-insert`).
  - The house style rules in `CLAUDE.md` are the example brand's defaults and are worth reading and adjusting.
