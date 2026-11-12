# Contributing

Issues and pull requests are welcome.

- **Bugs and ideas:** open an issue. For bugs, include the command you ran, the error output and, if relevant, the `edl.json` (without private media).
- **Components:** new graphics belong in `remotion/components/` and must fit the house style system – build them from `remotion/look/` (colors and type come from `brand/brand.json`), with `def.ts`, the component and `meta.md`. The `/new-component` skill walks through it. Run `npm run gen` afterwards.
- **Rules and skills:** changes to `CLAUDE.md` or `.claude/` should stay generic – no rules that only make sense for one video or one brand.
- **Before a PR:**
  ```bash
  npm run typecheck
  npm run timeline -- _demo && npm run render -- _demo --draft
  ```
- **Never commit** `.env`, API keys, footage or rendered videos.
