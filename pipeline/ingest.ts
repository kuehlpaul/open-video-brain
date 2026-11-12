/**
 * Ingests footage: technical data (work/footage.json) + a 16 kHz mono audio track
 * per clip (work/audio-proxy/) for transcription.
 *   npm run ingest -- <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { probe, runOrThrow } from './lib/exec';
import { formatTime, log, main } from './lib/log';
import { AUDIO_EXT, VIDEO_EXT, baseName, ensureDir, listFiles, publicRel, writeJson } from './lib/paths';
import type { FootageInfo } from './schemas/transcript';

const USAGE = 'npm run ingest -- <slug> [--force]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, { force: { type: 'boolean', default: false } });
  const { paths, config } = loadProject(positionals[0], USAGE);
  if (config.sourceProject) {
    log.info(`This project uses the footage of ${config.sourceProject} – ingest there.`);
    return;
  }
  const files = listFiles(paths.footage, [...VIDEO_EXT, ...AUDIO_EXT]);
  if (!files.length) throw new Error(`No footage in ${paths.footage}`);

  log.step(`Ingesting ${files.length} files`);
  ensureDir(paths.audioProxy);
  const index: FootageInfo[] = [];
  let total = 0;
  for (const f of files) {
    const abs = path.join(paths.footage, f);
    const p = await probe(abs);
    if (!p.hasAudio) log.warn(`${f}: no audio track – will not be transcribed`);
    index.push({
      clip: f,
      src: publicRel(abs),
      duration: p.duration,
      fps: p.fps || 30,
      width: p.width,
      height: p.height,
      hasAudio: p.hasAudio,
      codec: p.codec,
    });
    total += p.duration;

    const proxy = path.join(paths.audioProxy, `${baseName(f)}.wav`);
    if (p.hasAudio && (values.force || !fs.existsSync(proxy))) {
      await runOrThrow(
        'ffmpeg',
        ['-y', '-hide_banner', '-loglevel', 'error', '-i', abs, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', proxy],
        `audio proxy ${f}`,
      );
    }
    log.ok(`${f}  ${formatTime(p.duration)}  ${p.width}×${p.height}  ${p.fps.toFixed(2)} fps  ${p.codec ?? ''}`);
  }
  writeJson(paths.footageIndex, index);
  log.ok(`work/footage.json written – ${formatTime(total)} of footage in total`);
});
