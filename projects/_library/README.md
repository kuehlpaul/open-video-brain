# _library – shared media

- `broll/` reusable B-roll (city, office, nature …). The file name describes the content: `city-night-drone.mp4`
- `music/` music beds (e.g. generated with ElevenLabs Music or `npm run music`). Third-party music only with a license that covers YouTube; keep the proof as a `.txt` with the same name next to it.
- `images/` photos and stills, each with a `.json` holding source and license

Media files in these folders are not tracked by git (only `.gitkeep`).

Reference them in edl.json relative to the project folder, e.g. `"../_library/broll/city-night-drone.mp4"` (nested projects: see `projects/README.md`).
