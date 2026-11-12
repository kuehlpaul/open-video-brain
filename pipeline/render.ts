/**
 * Renders timeline.json → finished video + captions + YouTube chapters.
 *   npm run render -- <slug> --draft     fast, half resolution → work/render/<slug>-draft.mp4
 *   npm run render -- <slug>             final → output/<slug>.mp4 (+ .srt, .chapters.txt)
 *   npm run render -- <slug> --hq        final at highest quality (CRF 12, x264 slow, audio 320 kbit/s) – larger, takes longer
 *
 * After rendering: normalizes loudness to −14 LUFS / −1.5 dBTP (YouTube standard).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { serializeSrt, type Caption } from '@remotion/captions';
import { brand } from '../brand/tokens';
import { loadProject, parseCli } from './lib/cli';
import { runOrThrow } from './lib/exec';
import { formatTime, log, main } from './lib/log';
import { ensureDir, readJson, rootRel } from './lib/paths';
import { bundleRemotion, rendererOptions } from './lib/remotion';
import { Timeline } from './schemas/timeline';

const USAGE = 'npm run render -- <slug> [--draft | --hq] [--frames 0-299] [--no-normalize]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    draft: { type: 'boolean', default: false },
    hq: { type: 'boolean', default: false },
    frames: { type: 'string' },
    'no-normalize': { type: 'boolean', default: false },
  });
  const { paths, config } = loadProject(positionals[0], USAGE);
  if (!fs.existsSync(paths.timeline)) throw new Error(`work/timeline.json missing – npm run timeline -- ${config.slug}`);
  const timeline = Timeline.parse(readJson(paths.timeline));
  const draft = values.draft;
  const hq = values.hq && !draft;
  const outDir = ensureDir(draft ? paths.render : paths.output);
  const name = draft ? `${config.slug}-draft` : config.slug;
  const raw = path.join(ensureDir(paths.render), `${name}.raw.mp4`);
  const final = path.join(outDir, `${name}.mp4`);

  log.step(`Render ${draft ? 'draft' : hq ? 'final (highest quality)' : 'final'}: ${formatTime(timeline.durationInFrames / timeline.fps)} · ${timeline.width}×${timeline.height}`);
  const serveUrl = await bundleRemotion();
  const inputProps = timeline as unknown as Record<string, unknown>;
  const composition = await selectComposition({ serveUrl, id: 'Main', inputProps, ...rendererOptions() });

  const frameRange = values.frames ? (values.frames.split('-').map(Number) as [number, number]) : null;
  let lastPct = -1;
  const started = Date.now();
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    outputLocation: raw,
    crf: draft ? 28 : hq ? 12 : 18,
    x264Preset: draft ? 'veryfast' : hq ? 'slow' : 'medium',
    scale: draft ? 0.5 : 1,
    frameRange,
    audioCodec: 'aac',
    audioBitrate: '320k',
    concurrency: Math.max(1, Math.floor(os.cpus().length * 0.75)),
    ...rendererOptions(),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= lastPct + 5) {
        lastPct = pct;
        log.dim(`${pct}%`);
      }
    },
  });
  log.ok(`Rendered in ${formatTime((Date.now() - started) / 1000)}`);

  if (values['no-normalize']) {
    fs.renameSync(raw, final);
  } else {
    await normalizeLoudness(raw, final, hq ? '320k' : '256k');
    fs.rmSync(raw);
  }
  log.ok(`Video: ${rootRel(final)}`);

  if (!draft) {
    const srt = path.join(outDir, `${config.slug}.srt`);
    fs.writeFileSync(srt, toSrt(timeline.captions.tokens));
    log.ok(`Captions: ${rootRel(srt)}`);
    const chapters = youtubeChapters(timeline);
    if (chapters) {
      const f = path.join(outDir, `${config.slug}.chapters.txt`);
      fs.writeFileSync(f, chapters.text);
      log.ok(`YouTube chapters: ${rootRel(f)}`);
      chapters.warnings.forEach((w) => log.warn(w));
    }
  }
});

async function normalizeLoudness(input: string, output: string, audioBitrate: string) {
  const { targetLufs, truePeakDb } = brand.audio;
  const base = `loudnorm=I=${targetLufs}:TP=${truePeakDb}:LRA=11`;
  const pass1 = await runOrThrow('ffmpeg', ['-hide_banner', '-i', input, '-af', `${base}:print_format=json`, '-f', 'null', '-'], 'measure loudness');
  const json = pass1.stderr.slice(pass1.stderr.lastIndexOf('{'), pass1.stderr.lastIndexOf('}') + 1);
  const m = JSON.parse(json) as Record<string, string>;
  const filter = `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await runOrThrow(
    'ffmpeg',
    ['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-c:v', 'copy', '-af', filter, '-ar', '48000', '-c:a', 'aac', '-b:a', audioBitrate, '-movflags', '+faststart', output],
    'normalize loudness',
  );
  log.ok(`Loudness: ${Number(m.input_i).toFixed(1)} → ${targetLufs} LUFS`);
}

/** Caption lines: max. ~42 characters, break at sentence end or pause > 0.7 s. */
function toSrt(tokens: Caption[]): string {
  const lines: Caption[][] = [];
  let cur: Caption[] = [];
  let len = 0;
  tokens.forEach((t, i) => {
    const prev = tokens[i - 1];
    const gap = prev ? t.startMs - prev.endMs : 0;
    if (cur.length && (len + t.text.length > 42 || gap > 700 || /[.!?]$/.test(prev?.text ?? ''))) {
      lines.push(cur);
      cur = [];
      len = 0;
    }
    cur.push({ ...t, text: cur.length ? t.text : t.text.trimStart() });
    len += t.text.length;
  });
  if (cur.length) lines.push(cur);
  return serializeSrt({ lines });
}

function youtubeChapters(t: Timeline): { text: string; warnings: string[] } | null {
  // chapters come from edl.sequence[].chapter (there are no on-screen chapter cards)
  const raw = t.chapters.map((c) => ({ sec: c.from / t.fps, title: c.title })).sort((a, b) => a.sec - b.sec);
  const chapters = raw.filter((c, i) => i === 0 || c.sec - raw[i - 1].sec > 1);
  if (!chapters.length) return null;
  const warnings: string[] = [];
  if (chapters[0].sec > 0.5) chapters.unshift({ sec: 0, title: 'Intro' });
  else chapters[0].sec = 0;
  if (chapters.length < 3) warnings.push('YouTube only shows chapters with at least 3 entries.');
  chapters.forEach((c, i) => {
    const next = chapters[i + 1]?.sec ?? t.durationInFrames / t.fps;
    if (next - c.sec < 10) warnings.push(`Chapter "${c.title}" is shorter than 10 s (YouTube minimum).`);
  });
  return { text: chapters.map((c) => `${formatTime(c.sec)} ${c.title}`).join('\n') + '\n', warnings };
}
