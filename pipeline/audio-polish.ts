/**
 * Cleans up the audio per clip → work/audio/<clip>.wav (same length as the original).
 *   npm run audio -- <slug>              high-pass + gentle compression (free, local)
 *   npm run audio -- <slug> --isolate    plus ElevenLabs Voice Isolation (billed per minute)
 *   npm run audio -- <slug> --blend=-12 [--lag=125]
 *       → work/audio/<clip>.blend.wav: existing isolated voice + denoised original quietly underneath (default −12 dB).
 *         Masks the tinny isolation artifacts. --lag = samples (48 kHz) by which the original is delayed so both
 *         line up (the isolated track can lag the original, e.g. by 125 samples).
 *         Use it in the EDL with "audioVariant": "blend". Free, local; the longform stays untouched.
 *
 * build-timeline automatically uses the processed track once it exists.
 * Loudness (−14 LUFS) is normalized only at render time for the finished video.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { audioIsolation } from './lib/elevenlabs';
import { probe, runOrThrow } from './lib/exec';
import { log, main } from './lib/log';
import { baseName, ensureDir, fromPublicRel, readJson } from './lib/paths';
import { FootageIndex } from './schemas/transcript';

const USAGE = 'npm run audio -- <slug> [--isolate] [--blend=<dB>] [--lag=<samples>] [--force] [--clip A001.mov]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    isolate: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    clip: { type: 'string', multiple: true },
    blend: { type: 'string' },
    lag: { type: 'string' },
  });
  const { config, source } = loadProject(positionals[0], USAGE);
  if (config.sourceProject) log.info(`Processing audio in source project ${config.sourceProject}`);
  const footage = FootageIndex.parse(readJson(source.footageIndex)).filter(
    (f) => f.hasAudio && (!values.clip || values.clip.includes(f.clip)),
  );
  ensureDir(source.audio);
  const isoFile = (clip: string) => path.join(source.audio, `${baseName(clip)}.isolated.mp3`);
  // An isolated track that already exists is reused (it was paid for); only --force sends the clip again.
  const needsIsolation = (clip: string) => values.isolate && (values.force || !fs.existsSync(isoFile(clip)));
  if (values.isolate && values.blend === undefined) {
    const minutes = footage.filter((f) => needsIsolation(f.clip)).reduce((s, f) => s + f.duration, 0) / 60;
    if (minutes > 0) log.warn(`Voice Isolation for ${minutes.toFixed(1)} min of footage (ElevenLabs bills per minute).`);
    else log.info('Voice Isolation: all isolated tracks exist already – nothing is billed (--force to isolate again).');
  }

  if (values.blend !== undefined) {
    const gainDb = values.blend === '' ? -12 : Number(values.blend);
    const lag = values.lag ? Math.round(Number(values.lag)) : 0;
    log.step(`Blend track: isolated voice + original at ${gainDb} dB (offset ${lag} samples)`);
    for (const f of footage) {
      const iso = path.join(source.audio, `${baseName(f.clip)}.isolated.mp3`);
      const out = path.join(source.audio, `${baseName(f.clip)}.blend.wav`);
      if (!fs.existsSync(iso)) {
        log.warn(`${f.clip}: no isolated track (run --isolate first) – skipped`);
        continue;
      }
      if (fs.existsSync(out) && !values.force) {
        log.dim(`${f.clip}: exists (--force to recompute)`);
        continue;
      }
      const delay = lag > 0 ? `adelay=${lag}S:all=1,` : lag < 0 ? `atrim=start_sample=${-lag},asetpts=PTS-STARTPTS,` : '';
      const graph =
        `[0:a]aresample=48000,aformat=channel_layouts=mono,highpass=f=75[v];` +
        `[1:a]aresample=48000,aformat=channel_layouts=mono,${delay}highpass=f=75,afftdn=nf=-30,volume=${gainDb}dB[r];` +
        `[v][r]amix=inputs=2:normalize=0:duration=first,` +
        `acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,alimiter=limit=0.95[out]`;
      await runOrThrow(
        'ffmpeg',
        ['-y', '-hide_banner', '-loglevel', 'error', '-i', iso, '-i', fromPublicRel(f.src), '-filter_complex', graph, '-map', '[out]', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', out],
        `blend track ${f.clip}`,
      );
      const p = await probe(out);
      if (Math.abs(p.duration - f.duration) > 0.08) log.warn(`${f.clip}: length differs by ${Math.abs(p.duration - f.duration).toFixed(2)} s – check it`);
      log.ok(`${f.clip} → ${path.basename(out)}`);
    }
    return;
  }

  log.step(`Processing audio (${footage.length} clips)`);
  for (const f of footage) {
    const input = fromPublicRel(f.src);
    const out = path.join(source.audio, `${baseName(f.clip)}.wav`);
    const iso = isoFile(f.clip);
    const isolateNow = needsIsolation(f.clip);
    // With --isolate the polished track must come from the isolated one: an older <clip>.wav from a run without --isolate is rebuilt.
    const upToDate = fs.existsSync(out) && (!values.isolate || (!isolateNow && fs.statSync(out).mtimeMs >= fs.statSync(iso).mtimeMs));
    if (upToDate && !values.force) {
      log.dim(`${f.clip}: exists (--force to recompute)`);
      continue;
    }
    let src = input;
    if (values.isolate) {
      if (isolateNow) {
        const tmpIn = path.join(source.audio, `${baseName(f.clip)}.src.wav`);
        await runOrThrow('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-vn', '-ac', '1', '-ar', '44100', tmpIn], 'extract audio');
        const isolated = await audioIsolation(tmpIn);
        fs.writeFileSync(iso, isolated);
        fs.rmSync(tmpIn);
      } else log.dim(`${f.clip}: isolated track from cache`);
      src = iso;
    }
    const filters = [
      'highpass=f=75',
      values.isolate ? null : 'afftdn=nf=-30',
      'acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2',
      'alimiter=limit=0.95',
    ].filter(Boolean);
    await runOrThrow(
      'ffmpeg',
      ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vn', '-af', filters.join(','), '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', out],
      `audio filter ${f.clip}`,
    );
    const p = await probe(out);
    const drift = Math.abs(p.duration - f.duration);
    if (drift > 0.08) {
      fs.renameSync(out, out.replace(/\.wav$/, '.drift.wav'));
      log.warn(`${f.clip}: length differs by ${drift.toFixed(2)} s – discarded, original audio stays.`);
      continue;
    }
    log.ok(`${f.clip}${values.isolate ? ' (isolated)' : ''}`);
  }
});
