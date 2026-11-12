# projects/

One folder per video. Create it with `npm run new -- <slug>`, never by hand.

```
<slug>/
├── project.json        format, language, speaker, keyterms
├── input/
│   ├── footage/        raw footage (copy camera files in unchanged)
│   └── script.md       script (conventions in _template/input/script.md)
├── work/               everything generated – may be deleted and rebuilt
│   ├── footage.json        technical data (ingest)
│   ├── transcripts/        Scribe transcripts (.json words, .txt readable)
│   ├── candidates.md       takes per script sentence (align)
│   ├── visuals.json        photo/video/graphic per beat (/visuals-plan)
│   ├── edl.json            editing decisions (written by Claude)
│   ├── timeline.json       frame-accurate cut (build-timeline)
│   ├── audio/ voice/ assets/ faces/ render/ qa/
└── output/             finished video, .srt, .chapters.txt
```

A video with Shorts gets a parent folder. Slugs stay flat IDs (`npm run … -- <slug>`); the pipeline finds the folder via `project.json`:

```
2026-11-my-show-04/                  parent folder (slug of the longform)
├── longform/                        longform project (structure as above), slug 2026-11-my-show-04
└── shorts/<topic>/                  one project per Short, slug 2026-11-my-show-04-short-<topic>
```

`npm run new -- <slug>` puts longforms into `<slug>/longform/` automatically, Shorts with `--source <longform>` into `<longform>/shorts/<topic>/`. Single videos without Shorts stay flat.
Relative paths in `edl.json` start at the project folder: longform `../../_library/…`, Short `../../../_library/…`, or `../../longform/work/assets/…` for B-roll from the longform.

Special folders:
- `_template/` template for new projects
- `_library/` media shared by all videos: `broll/`, `music/` (licensed music only!), `images/`
- `_demo/` and `_demo-short/` test projects with synthetic footage: `npm run timeline -- _demo && npm run render -- _demo --draft`

This folder is Remotion's `public` directory. That's why all media live here and nowhere else.
