/**
 * Generates a music bed in the exact length of the cut (ElevenLabs Music).
 *   npm run music -- <slug> [--prompt "<text>"] [--seconds <n>] [--force]
 *
 * Run it only once the cut is locked (length from work/timeline.json). If the length changes afterwards,
 * regenerate – otherwise the final hit no longer lands on the end.
 * Cached by hash(prompt + length). Result: work/assets/music-<hash>.mp3 + .json
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { composeMusic } from './lib/elevenlabs';
import { log, main } from './lib/log';
import { ensureDir, readJson, writeJson } from './lib/paths';
import { Timeline } from './schemas/timeline';

const USAGE = 'npm run music -- <slug> [--prompt "<text>"] [--seconds <n>] [--force]';

/** Default prompts per format */
const PROMPTS = {
  short:
    'energetic modern electronic pop beat for short-form social video, punchy kick, bright synth stabs, driving 122 bpm, no vocals, clean, confident, strong start on the first beat, steady energy throughout, a short lift in the last 3 seconds, then a clear final button hit exactly at the end, no fade-out',
  longform:
    'Calm modern electronic news bed, light pulsing synths, soft kick, minimal, warm, optimistic, unobtrusive under speech, no vocals, no melody lead, steady 100 bpm',
};

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    prompt: { type: 'string' },
    seconds: { type: 'string' },
    force: { type: 'boolean', default: false },
  });
  const { paths, config } = loadProject(positionals[0], USAGE);
  let seconds = values.seconds ? Number(values.seconds) : NaN;
  if (!Number.isFinite(seconds)) {
    if (!fs.existsSync(paths.timeline)) throw new Error(`work/timeline.json missing – run npm run timeline -- ${config.slug} first (or pass --seconds)`);
    const t = Timeline.parse(readJson(paths.timeline));
    seconds = t.durationInFrames / t.fps;
  }
  if (seconds < 10) throw new Error(`Length ${seconds.toFixed(1)} s is too short (min. 10 s)`);
  const prompt = values.prompt ?? PROMPTS[config.format];
  const lengthMs = Math.round(seconds * 1000);
  const hash = crypto.createHash('sha1').update(`${prompt}|${lengthMs}`).digest('hex').slice(0, 8);
  const out = path.join(ensureDir(paths.assets), `music-${hash}.mp3`);
  const rel = path.relative(paths.dir, out).split(path.sep).join('/');

  if (fs.existsSync(out) && !values.force) {
    log.ok(`already exists (cached): ${rel}`);
  } else {
    log.step(`Music ${seconds.toFixed(1)} s (${config.format})`);
    log.dim(prompt);
    const mp3 = await composeMusic(prompt, lengthMs);
    fs.writeFileSync(out, mp3);
    writeJson(out.replace(/\.mp3$/, '.json'), { kind: 'music', model: 'elevenlabs/v1/music', prompt, music_length_ms: lengthMs, created: new Date().toISOString() });
    log.ok(`written: ${rel}`);
  }
  const fade = config.format === 'short' ? 0 : 2.5;
  log.info(`Add to edl.json: "music": { "file": "${rel}", "fadeIn": 0, "fadeOut": ${fade} }`);
  if (config.format === 'short') log.dim('Short: fadeOut 0 – the final hit lands on the last frame.');
});
